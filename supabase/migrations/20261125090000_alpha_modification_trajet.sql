-- Lot R3 (arbitrages A6 à A8 du 23 novembre 2026) : changer de destination
-- et ajouter des arrêts pendant une course. Le prix reste fixé par le serveur.

insert into public.app_config(key, value) values
  ('route_change', '{"max_stops":2,"max_changes":3,"timeout_s":30,"free_wait_min":3}'::jsonb)
  on conflict (key) do nothing;

create table public.ride_stops (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  seq smallint not null check (seq between 1 and 9),
  geom extensions.geometry(Point, 4326) not null,
  landmark_id uuid references public.landmarks(id),
  hint text check (hint is null or char_length(hint) <= 200),
  arrived_at timestamptz,
  left_at timestamptz,
  wait_charged numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (ride_id, seq)
);
alter table public.ride_stops enable row level security;
revoke all on public.ride_stops from public, anon, authenticated;
grant select on public.ride_stops to authenticated;
grant all on public.ride_stops to service_role;
create policy ride_stops_read on public.ride_stops for select to authenticated
  using (exists (select 1 from public.rides r where r.id = ride_id
    and (r.client_id = auth.uid() or r.driver_id = auth.uid() or public.is_admin())));

create table public.ride_route_changes (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  client_id uuid not null references public.profiles(id),
  driver_id uuid not null references public.drivers(id),
  status text not null default 'quoted'
    check (status in ('quoted','pending','accepted','refused','expired','cancelled')),
  dest_geom extensions.geometry(Point, 4326) not null,
  dest_landmark_id uuid references public.landmarks(id),
  dest_hint text check (dest_hint is null or char_length(dest_hint) <= 200),
  stops jsonb not null default '[]'::jsonb,
  driven_m integer not null check (driven_m >= 0),
  remaining_m integer not null check (remaining_m > 0),
  remaining_s integer not null check (remaining_s > 0),
  route_shape text not null,
  old_price numeric(12,2) not null,
  new_price numeric(12,2) not null check (new_price >= old_price),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  requested_at timestamptz,
  respond_by timestamptz,
  responded_at timestamptz
);
create index ride_route_changes_ride on public.ride_route_changes(ride_id, created_at desc);
create unique index ride_route_changes_one_pending on public.ride_route_changes(ride_id)
  where status = 'pending';
alter table public.ride_route_changes enable row level security;
revoke all on public.ride_route_changes from public, anon, authenticated;
grant select on public.ride_route_changes to authenticated;
grant all on public.ride_route_changes to service_role;
-- Le chauffeur ne voit une modification qu'une fois demandée par le passager.
create policy route_changes_read on public.ride_route_changes for select to authenticated
  using (client_id = auth.uid() or (driver_id = auth.uid() and status <> 'quoted')
    or public.is_admin());
alter publication supabase_realtime add table public.ride_route_changes, public.ride_stops;

create function private.route_change_setting(p_key text, p_default integer)
returns integer language sql stable security definer set search_path = public
as $$
  select coalesce((select (value->>p_key)::integer from public.app_config
    where key = 'route_change'), p_default);
$$;
revoke all on function private.route_change_setting(text, integer) from public, anon, authenticated;

-- Point de départ du recalcul : la dernière position connue du serveur une
-- fois la course commencée, jamais une position envoyée par le passager.
create function public.route_change_origin(p_ride uuid, p_client uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare r public.rides; here extensions.geometry;
begin
  select * into r from public.rides where id = p_ride;
  if not found or r.client_id is distinct from p_client then
    raise exception 'Course introuvable' using errcode = '42501';
  end if;
  if r.status not in ('accepted','enroute','arrived','started') or r.driver_id is null then
    raise exception 'Trajet non modifiable à ce stade' using errcode = '22023';
  end if;
  if r.category = 'covoiturage' then
    raise exception 'Trajet non modifiable en covoiturage' using errcode = '22023';
  end if;
  if r.status = 'started' then
    select geom into here from public.ride_locations where ride_id = r.id
      order by recorded_at desc limit 1;
    if here is null then
      select geom into here from public.driver_presence where driver_id = r.driver_id;
    end if;
  end if;
  here := coalesce(here, r.origin_geom);
  return jsonb_build_object(
    'lon', extensions.st_x(here), 'lat', extensions.st_y(here), 'category', r.category);
end;
$$;
revoke all on function public.route_change_origin(uuid, uuid) from public, anon, authenticated;
grant execute on function public.route_change_origin(uuid, uuid) to service_role;

-- Devis de modification, appelé par la fonction de routage seulement.
-- p_stops : arrêts restants [{lon,lat,landmark_id?,hint?}] dans l'ordre.
create function public.create_route_change_quote(
  p_ride uuid, p_client uuid, p_dest jsonb, p_stops jsonb, p_route jsonb
) returns public.ride_route_changes language plpgsql security definer set search_path = public
as $$
declare r public.rides; c public.ride_route_changes; zone uuid; ttl integer;
  driven integer := 0; elapsed integer := 0; visited integer; stop jsonb;
  remaining_m integer := (p_route->>'distance_m')::integer;
  remaining_s integer := (p_route->>'duration_s')::integer;
  dest extensions.geometry; price numeric;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found or r.client_id is distinct from p_client then
    raise exception 'Course introuvable' using errcode = '42501';
  end if;
  if not private.user_alpha_invited(p_client, 'client') then
    raise exception 'Invitation alpha requise pour ce compte vérifié' using errcode = '42501';
  end if;
  if r.status not in ('accepted','enroute','arrived','started') or r.driver_id is null
    or r.category = 'covoiturage' then
    raise exception 'Trajet non modifiable à ce stade' using errcode = '22023';
  end if;
  if jsonb_typeof(p_stops) <> 'array' or remaining_m is null or remaining_m <= 0
    or remaining_s is null or remaining_s <= 0 or coalesce(p_route->>'shape', '') = '' then
    raise exception 'Itinéraire invalide' using errcode = '22023';
  end if;
  select count(*) into visited from public.ride_stops
    where ride_id = r.id and arrived_at is not null;
  if visited + jsonb_array_length(p_stops) > private.route_change_setting('max_stops', 2) then
    raise exception 'Nombre d''arrêts maximal atteint' using errcode = '22023';
  end if;
  if (select count(*) from public.ride_route_changes where ride_id = r.id
      and status in ('pending','accepted')) >= private.route_change_setting('max_changes', 3) then
    raise exception 'Nombre de modifications maximal atteint' using errcode = '22023';
  end if;
  for stop in select * from jsonb_array_elements(p_stops) loop
    if abs((stop->>'lon')::numeric) > 180 or abs((stop->>'lat')::numeric) > 90
      or char_length(coalesce(stop->>'hint', '')) > 200 then
      raise exception 'Arrêt invalide' using errcode = '22023';
    end if;
  end loop;
  dest := extensions.st_setsrid(extensions.st_makepoint(
    (p_dest->>'lon')::float8, (p_dest->>'lat')::float8), 4326);
  if r.status = 'started' then
    select coalesce(round(extensions.st_length(
      extensions.st_makeline(geom order by recorded_at)::extensions.geography))::integer, 0)
      into driven from public.ride_locations where ride_id = r.id;
    elapsed := greatest(extract(epoch from now() - r.started_at)::integer, 0);
  end if;
  select id into zone from public.zones where is_active and extensions.st_contains(geom, r.origin_geom) limit 1;
  price := greatest(r.price_est,
    public.estimate_price(r.category, driven + remaining_m, elapsed + remaining_s, zone));
  select (value #>> '{}')::integer into ttl from public.app_config where key = 'quote_ttl_s';
  update public.ride_route_changes set status = 'cancelled'
    where ride_id = r.id and status = 'quoted';
  insert into public.ride_route_changes(ride_id, client_id, driver_id, dest_geom,
    dest_landmark_id, dest_hint, stops, driven_m, remaining_m, remaining_s, route_shape,
    old_price, new_price, expires_at)
  values (r.id, r.client_id, r.driver_id, dest, nullif(p_dest->>'landmark_id', '')::uuid,
    nullif(p_dest->>'hint', ''), p_stops, driven, remaining_m, remaining_s, p_route->>'shape',
    r.price_est, price, now() + make_interval(secs => coalesce(ttl, 300)))
  returning * into c;
  return c;
end;
$$;
revoke all on function public.create_route_change_quote(uuid, uuid, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_route_change_quote(uuid, uuid, jsonb, jsonb, jsonb)
  to service_role;

-- Le passager confirme le nouveau prix : le chauffeur a 30 secondes.
create function public.request_route_change(p_change uuid)
returns public.ride_route_changes language plpgsql security definer set search_path = public
as $$
declare c public.ride_route_changes; r public.rides;
begin
  perform private.assert_alpha_invited('client');
  select * into c from public.ride_route_changes where id = p_change for update;
  if not found or c.client_id is distinct from auth.uid() then
    raise exception 'Modification introuvable' using errcode = '42501';
  end if;
  select * into r from public.rides where id = c.ride_id for update;
  if c.status <> 'quoted' or c.expires_at <= now() then
    raise exception 'Devis expiré' using errcode = '22023';
  end if;
  if r.status not in ('accepted','enroute','arrived','started')
    or r.price_est is distinct from c.old_price or r.driver_id is distinct from c.driver_id then
    raise exception 'Trajet non modifiable à ce stade' using errcode = '22023';
  end if;
  if exists (select 1 from public.ride_route_changes where ride_id = r.id and status = 'pending') then
    raise exception 'Une modification attend déjà la réponse du chauffeur' using errcode = '22023';
  end if;
  update public.ride_route_changes set status = 'pending', requested_at = now(),
    respond_by = now() + make_interval(secs => private.route_change_setting('timeout_s', 30))
    where id = c.id returning * into c;
  insert into public.ride_events(ride_id, type, actor, meta) values (r.id, 'route_change_requested',
    auth.uid(), jsonb_build_object('change_id', c.id, 'old_price', c.old_price, 'new_price', c.new_price));
  perform public.enqueue_notification(c.driver_id, 'route_change_request',
    jsonb_build_object('ride_id', r.id, 'change_id', c.id, 'expires_at', c.respond_by));
  return c;
end;
$$;
revoke all on function public.request_route_change(uuid) from public, anon;
grant execute on function public.request_route_change(uuid) to authenticated;

create function public.respond_route_change(p_change uuid, p_accept boolean)
returns public.ride_route_changes language plpgsql security definer set search_path = public
as $$
declare c public.ride_route_changes; r public.rides; stop jsonb; position integer; elapsed integer := 0;
begin
  select * into c from public.ride_route_changes where id = p_change for update;
  if not found or c.driver_id is distinct from auth.uid() or c.status = 'quoted' then
    raise exception 'Modification introuvable' using errcode = '42501';
  end if;
  select * into r from public.rides where id = c.ride_id for update;
  if c.status <> 'pending' then
    raise exception 'Modification déjà traitée' using errcode = '22023';
  end if;
  if c.respond_by <= now() or r.status not in ('accepted','enroute','arrived','started')
    or r.price_est is distinct from c.old_price then
    update public.ride_route_changes set status = 'expired', responded_at = now()
      where id = c.id returning * into c;
    perform public.enqueue_notification(c.client_id, 'route_change_refused',
      jsonb_build_object('ride_id', r.id, 'change_id', c.id, 'reason', 'expired'));
    return c;
  end if;
  if not coalesce(p_accept, false) then
    update public.ride_route_changes set status = 'refused', responded_at = now()
      where id = c.id returning * into c;
    insert into public.ride_events(ride_id, type, actor, meta) values (r.id, 'route_change_refused',
      auth.uid(), jsonb_build_object('change_id', c.id));
    perform public.enqueue_notification(c.client_id, 'route_change_refused',
      jsonb_build_object('ride_id', r.id, 'change_id', c.id, 'reason', 'refused'));
    return c;
  end if;
  if r.status = 'started' then
    elapsed := greatest(extract(epoch from now() - r.started_at)::integer, 0);
  end if;
  delete from public.ride_stops where ride_id = r.id and arrived_at is null;
  select coalesce(max(seq), 0) into position from public.ride_stops where ride_id = r.id;
  for stop in select * from jsonb_array_elements(c.stops) loop
    position := position + 1;
    insert into public.ride_stops(ride_id, seq, geom, landmark_id, hint) values (r.id, position,
      extensions.st_setsrid(extensions.st_makepoint((stop->>'lon')::float8, (stop->>'lat')::float8), 4326),
      nullif(stop->>'landmark_id', '')::uuid, nullif(stop->>'hint', ''));
  end loop;
  update public.rides set dest_geom = c.dest_geom, dest_landmark_id = c.dest_landmark_id,
    dest_hint = c.dest_hint, price_est = c.new_price,
    distance_est_m = c.driven_m + c.remaining_m, duration_est_s = elapsed + c.remaining_s
    where id = r.id;
  update public.ride_route_changes set status = 'accepted', responded_at = now()
    where id = c.id returning * into c;
  insert into public.ride_events(ride_id, type, actor, meta) values (r.id, 'route_changed', auth.uid(),
    jsonb_build_object('change_id', c.id, 'old_price', c.old_price, 'new_price', c.new_price,
      'stops', jsonb_array_length(c.stops)));
  perform public.enqueue_notification(c.client_id, 'route_change_accepted',
    jsonb_build_object('ride_id', r.id, 'change_id', c.id, 'price', c.new_price));
  return c;
end;
$$;
revoke all on function public.respond_route_change(uuid, boolean) from public, anon;
grant execute on function public.respond_route_change(uuid, boolean) to authenticated;

-- Sans réponse en 30 secondes, la course initiale se poursuit inchangée.
create function public.expire_route_changes()
returns integer language plpgsql security definer set search_path = public
as $$
declare c public.ride_route_changes; total integer := 0;
begin
  for c in update public.ride_route_changes set status = 'expired', responded_at = now()
    where status = 'pending' and respond_by <= now() returning * loop
    total := total + 1;
    perform public.enqueue_notification(c.client_id, 'route_change_refused',
      jsonb_build_object('ride_id', c.ride_id, 'change_id', c.id, 'reason', 'expired'));
  end loop;
  return total;
end;
$$;
revoke all on function public.expire_route_changes() from public, anon, authenticated;
select cron.schedule('teko-alpha-route-changes', '10 seconds', 'select public.expire_route_changes();');

create function private.driver_stop(p_stop uuid)
returns public.ride_stops language plpgsql security definer set search_path = public
as $$
declare s public.ride_stops; r public.rides;
begin
  select * into s from public.ride_stops where id = p_stop;
  if not found then raise exception 'Arrêt introuvable' using errcode = '42501'; end if;
  select * into r from public.rides where id = s.ride_id for update;
  if r.driver_id is distinct from auth.uid() then
    raise exception 'Action réservée au chauffeur assigné' using errcode = '42501';
  end if;
  if r.status <> 'started' then
    raise exception 'Arrêt possible seulement pendant la course' using errcode = '22023';
  end if;
  select * into s from public.ride_stops where id = p_stop for update;
  return s;
end;
$$;
revoke all on function private.driver_stop(uuid) from public, anon, authenticated;

create function public.arrive_stop(p_stop uuid)
returns public.ride_stops language plpgsql security definer set search_path = public
as $$
declare s public.ride_stops;
begin
  s := private.driver_stop(p_stop);
  if s.arrived_at is not null then return s; end if;
  if exists (select 1 from public.ride_stops where ride_id = s.ride_id and seq < s.seq
    and left_at is null) then
    raise exception 'Un arrêt précédent n''est pas terminé' using errcode = '22023';
  end if;
  update public.ride_stops set arrived_at = now() where id = s.id returning * into s;
  insert into public.ride_events(ride_id, type, actor, meta) values (s.ride_id, 'stop_arrived',
    auth.uid(), jsonb_build_object('stop_id', s.id, 'seq', s.seq));
  return s;
end;
$$;
revoke all on function public.arrive_stop(uuid) from public, anon;
grant execute on function public.arrive_stop(uuid) to authenticated;

-- Attente gratuite 3 minutes, puis chaque minute entamée au tarif per_min.
create function public.leave_stop(p_stop uuid)
returns public.ride_stops language plpgsql security definer set search_path = public
as $$
declare s public.ride_stops; r public.rides; rule public.pricing_rules; zone uuid;
  extra integer; charge numeric := 0;
begin
  s := private.driver_stop(p_stop);
  if s.arrived_at is null then
    raise exception 'Arrivée à l''arrêt non signalée' using errcode = '22023';
  end if;
  if s.left_at is not null then return s; end if;
  select * into r from public.rides where id = s.ride_id;
  select id into zone from public.zones where is_active and extensions.st_contains(geom, r.origin_geom) limit 1;
  select * into rule from public.pricing_rules where category = r.category
    and (zone_id = zone or zone_id is null)
    order by (zone_id = zone) desc nulls last, valid_from desc limit 1;
  extra := ceil(extract(epoch from now() - s.arrived_at) / 60.0)::integer
    - private.route_change_setting('free_wait_min', 3);
  if extra > 0 and rule.id is not null then
    charge := private.round_cash_amount(rule.per_min * extra);
  end if;
  update public.ride_stops set left_at = now(), wait_charged = charge
    where id = s.id returning * into s;
  if charge > 0 then
    update public.rides set price_est = price_est + charge where id = r.id;
  end if;
  insert into public.ride_events(ride_id, type, actor, meta) values (s.ride_id, 'stop_left', auth.uid(),
    jsonb_build_object('stop_id', s.id, 'seq', s.seq, 'wait_charged', charge,
      'old_price', r.price_est, 'new_price', r.price_est + charge));
  if charge > 0 then
    perform public.enqueue_notification(r.client_id, 'stop_wait_charged',
      jsonb_build_object('ride_id', r.id, 'amount', charge, 'price', r.price_est + charge));
  end if;
  return s;
end;
$$;
revoke all on function public.leave_stop(uuid) from public, anon;
grant execute on function public.leave_stop(uuid) to authenticated;

-- Une course ne se termine pas avec un arrêt en cours.
create function private.block_completion_with_open_stop()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'completed' and old.status = 'started' and exists (
    select 1 from public.ride_stops where ride_id = new.id
      and arrived_at is not null and left_at is null) then
    raise exception 'Un arrêt est en cours' using errcode = '22023';
  end if;
  if new.status not in ('accepted','enroute','arrived','started') then
    update public.ride_route_changes set status = 'cancelled', responded_at = now()
      where ride_id = new.id and status in ('quoted','pending');
  end if;
  return new;
end;
$$;
revoke all on function private.block_completion_with_open_stop() from public, anon, authenticated;
create trigger rides_route_change_closure before update of status on public.rides
  for each row execute function private.block_completion_with_open_stop();

notify pgrst, 'reload schema';
