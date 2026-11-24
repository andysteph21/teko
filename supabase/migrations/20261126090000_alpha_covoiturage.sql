-- Lot R4 (arbitrages A9 à A15 du 23 novembre 2026) : covoiturage payé à la
-- place. Chaque passager garde sa propre course ; le moteur financier ne
-- change pas. Fermé par défaut : shared_ride.enabled.

insert into public.app_config(key, value) values ('shared_ride',
  '{"enabled":false,"seats":3,"pickup_max_m":400,"detour_max_s":300,"speed_kmh":25}'::jsonb)
  on conflict (key) do nothing;

-- Tarif à la place : 250 FCFA/km, 500 FCFA jusqu'à 2 km, plafond 1 850 FCFA.
alter table public.pricing_rules add column max_fare numeric(12,2)
  check (max_fare is null or max_fare >= min_fare);
update public.pricing_rules set base_fare = 0, per_km = 250, per_min = 0,
  min_fare = 500, max_fare = 1850 where category = 'covoiturage';

create or replace function public.estimate_price(
  p_category public.vehicle_category, p_distance_m integer, p_duration_s integer,
  p_zone uuid default null
) returns numeric language plpgsql stable set search_path = public
as $$
declare r public.pricing_rules; v numeric;
begin
  select * into r from public.pricing_rules
   where category = p_category and (zone_id = p_zone or zone_id is null)
   order by (zone_id = p_zone) desc nulls last, valid_from desc limit 1;
  if r is null then return null; end if;
  v := r.base_fare + r.per_km * (p_distance_m::numeric / 1000.0)
     + r.per_min * (p_duration_s::numeric / 60.0);
  v := greatest(private.round_cash_amount(v), ceil(r.min_fare / 25) * 25);
  if r.max_fare is not null then v := least(v, floor(r.max_fare / 25) * 25); end if;
  return v;
end;
$$;

alter table public.rides add column seats smallint not null default 1 check (seats between 1 and 3);
alter table public.ride_quotes add column seats smallint not null default 1 check (seats between 1 and 3);
-- Arbitrage A13 : toutes les voitures reçoivent le covoiturage, sauf refus du chauffeur.
alter table public.drivers add column shared_enabled boolean not null default true;

create table public.shared_trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index shared_trips_one_open on public.shared_trips(driver_id) where status = 'open';
alter table public.shared_trips enable row level security;
revoke all on public.shared_trips from public, anon, authenticated;
grant select on public.shared_trips to authenticated;
grant all on public.shared_trips to service_role;
create policy shared_trips_read on public.shared_trips for select to authenticated
  using (driver_id = auth.uid() or public.is_admin());
alter table public.rides add column shared_trip_id uuid references public.shared_trips(id);
create index rides_shared_trip on public.rides(shared_trip_id) where shared_trip_id is not null;

create function private.shared_setting(p_key text, p_default numeric)
returns numeric language sql stable security definer set search_path = public
as $$
  select coalesce((select (value->>p_key)::numeric from public.app_config
    where key = 'shared_ride'), p_default);
$$;
revoke all on function private.shared_setting(text, numeric) from public, anon, authenticated;

-- Devis : le nombre de places multiplie le prix à la place.
drop function public.create_ride_quote(uuid, public.vehicle_category, extensions.geometry,
  extensions.geometry, integer, integer, text);
drop function public._create_ride_quote(uuid, public.vehicle_category, extensions.geometry,
  extensions.geometry, integer, integer, text);
create function public._create_ride_quote(
  p_client uuid, p_category public.vehicle_category, p_origin extensions.geometry,
  p_dest extensions.geometry, p_distance_m integer, p_duration_s integer, p_shape text,
  p_options jsonb default '{}'::jsonb
) returns public.ride_quotes language plpgsql security definer set search_path = public
as $$
declare q public.ride_quotes; zone uuid; ttl integer; price numeric;
  seats integer := coalesce((p_options->>'seats')::integer, 1);
begin
  if not exists (select 1 from public.profiles where id = p_client and role = 'client'
    and deleted_at is null) then
    raise exception 'Compte passager requis' using errcode = '42501';
  end if;
  if p_category not in ('eco','moto','confort','covoiturage') or p_shape is null or p_shape = '' then
    raise exception 'Itinéraire invalide' using errcode = '22023';
  end if;
  if seats < 1 or seats > private.shared_setting('seats', 3)
    or (seats > 1 and p_category <> 'covoiturage') then
    raise exception 'Nombre de places invalide' using errcode = '22023';
  end if;
  if p_category = 'covoiturage' and not coalesce((select (value->>'enabled')::boolean
      from public.app_config where key = 'shared_ride'), false) then
    raise exception 'Service non ouvert' using errcode = '22023';
  end if;
  select id into zone from public.zones where is_active and extensions.st_contains(geom, p_origin) limit 1;
  if zone is null then raise exception 'Départ hors zone de service' using errcode = '22023'; end if;
  select (value #>> '{}')::integer into ttl from public.app_config where key = 'quote_ttl_s';
  if ttl is null or ttl <= 0 then raise exception 'Validité des devis non configurée'; end if;
  price := public.estimate_price(p_category, p_distance_m, p_duration_s, zone) * seats;
  insert into public.ride_quotes(client_id, category, origin_geom, dest_geom,
    distance_m, duration_s, price, route_shape, expires_at, seats)
  values (p_client, p_category, p_origin, p_dest, p_distance_m, p_duration_s,
    price, p_shape, now() + make_interval(secs => ttl), seats) returning * into q;
  return q;
end;
$$;
create function public.create_ride_quote(
  p_client uuid, p_category public.vehicle_category, p_origin extensions.geometry,
  p_dest extensions.geometry, p_distance_m integer, p_duration_s integer, p_shape text,
  p_options jsonb default '{}'::jsonb
) returns public.ride_quotes language plpgsql security definer set search_path = public
as $$
begin
  if not private.user_alpha_invited(p_client, 'client') then
    raise exception 'Invitation alpha requise pour ce compte vérifié' using errcode = '42501';
  end if;
  return public._create_ride_quote(p_client, p_category, p_origin, p_dest, p_distance_m,
    p_duration_s, p_shape, p_options);
end;
$$;
revoke all on function public._create_ride_quote(uuid, public.vehicle_category, extensions.geometry,
  extensions.geometry, integer, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.create_ride_quote(uuid, public.vehicle_category, extensions.geometry,
  extensions.geometry, integer, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public._create_ride_quote(uuid, public.vehicle_category, extensions.geometry,
  extensions.geometry, integer, integer, text, jsonb) to service_role;
grant execute on function public.create_ride_quote(uuid, public.vehicle_category, extensions.geometry,
  extensions.geometry, integer, integer, text, jsonb) to service_role;

-- La course reprend les places du devis.
do $$
declare definition text; updated text;
begin
  definition := pg_get_functiondef('private.request_quoted_ride(uuid,text,text,uuid,uuid,uuid)'::regprocedure);
  updated := replace(replace(definition,
    'distance_est_m,duration_est_s,price_est,payment_method)',
    'distance_est_m,duration_est_s,price_est,payment_method,seats)'),
    'q.distance_m,q.duration_s,q.price,''cash'')',
    'q.distance_m,q.duration_s,q.price,''cash'',q.seats)');
  if updated = definition or position('q.seats' in updated) = 0
    or position('payment_method,seats)' in updated) = 0 then
    raise exception 'Places non reportées sur la course';
  end if;
  execute updated;
end;
$$;

-- Quel chauffeur peut servir cette course.
create function private.driver_serves(p_driver uuid, p_ride uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select case when r.category = 'covoiturage'
      then d.shared_enabled and d.categories && array['eco','confort']::public.vehicle_category[]
    else r.category = any(d.categories) end
  from public.drivers d, public.rides r where d.id = p_driver and r.id = p_ride;
$$;
revoke all on function private.driver_serves(uuid, uuid) from public, anon, authenticated;

-- Places déjà prises par les courses actives du chauffeur ; null s'il roule
-- pour une course qui n'est pas un covoiturage.
create function private.shared_seats_taken(p_driver uuid, p_except uuid)
returns integer language sql stable security definer set search_path = public
as $$
  select case when bool_or(category <> 'covoiturage') then null
    else coalesce(sum(seats), 0)::integer end
  from public.rides where driver_id = p_driver and id is distinct from p_except
    and status in ('accepted','enroute','arrived','started');
$$;
revoke all on function private.shared_seats_taken(uuid, uuid) from public, anon, authenticated;

-- Arbitrage A11 : prise en charge près de l'itinéraire des courses à bord et
-- détour estimé borné. Estimation à vol d'oiseau sur les itinéraires devisés.
create function private.shared_pickup_fits(p_driver uuid, p_ride uuid)
returns boolean language plpgsql stable security definer set search_path = public
as $$
declare r public.rides; pickup_m float8; drop_m float8;
begin
  select * into r from public.rides where id = p_ride;
  select min(extensions.st_distance(line::extensions.geography, r.origin_geom::extensions.geography)),
         min(extensions.st_distance(line::extensions.geography, r.dest_geom::extensions.geography))
    into pickup_m, drop_m
  from (select extensions.st_linefromencodedpolyline(q.route_shape, 6) as line
    from public.rides a join public.ride_quotes q on q.ride_id = a.id
    where a.driver_id = p_driver and a.category = 'covoiturage' and a.id <> p_ride
      and a.status in ('accepted','enroute','arrived','started')
      and left(q.route_shape, 1) <> '[') routes;
  if pickup_m is null then return false; end if;
  return pickup_m <= private.shared_setting('pickup_max_m', 400)
    and 2 * (pickup_m + drop_m) / (private.shared_setting('speed_kmh', 25) / 3.6)
      <= private.shared_setting('detour_max_s', 300);
end;
$$;
revoke all on function private.shared_pickup_fits(uuid, uuid) from public, anon, authenticated;

create function private.driver_available(p_driver uuid, p_ride uuid)
returns boolean language plpgsql stable security definer set search_path = public
as $$
declare r public.rides; taken integer;
begin
  if not exists (select 1 from public.rides where driver_id = p_driver and id <> p_ride
    and status in ('accepted','enroute','arrived','started')) then
    return true;
  end if;
  select * into r from public.rides where id = p_ride;
  if r.category <> 'covoiturage' then return false; end if;
  taken := private.shared_seats_taken(p_driver, p_ride);
  return taken is not null and taken + r.seats <= private.shared_setting('seats', 3)
    and private.shared_pickup_fits(p_driver, p_ride);
end;
$$;
revoke all on function private.driver_available(uuid, uuid) from public, anon, authenticated;

-- Dispatch : un covoiturage va d'abord aux trajets partagés en cours.
do $$
declare definition text; updated text;
begin
  definition := pg_get_functiondef('public.offer_next_driver(uuid)'::regprocedure);
  updated := replace(definition, 'r.category=any(d.categories)', 'private.driver_serves(d.id, r.id)');
  updated := regexp_replace(updated,
    'and not exists\(select 1 from public\.rides active where active\.driver_id=d\.id\s+and active\.status in \(''accepted'',''enroute'',''arrived'',''started''\)\)',
    'and private.driver_available(d.id, r.id)');
  updated := replace(updated, 'order by (o.id is not null), o.offered_at,',
    'order by (o.id is not null), o.offered_at,
      (r.category=''covoiturage'' and exists(select 1 from public.shared_trips t
        where t.driver_id=d.id and t.status=''open'')) desc,');
  if position('driver_serves' in updated) = 0 or position('driver_available' in updated) = 0
    or position('shared_trips t' in updated) = 0 then
    raise exception 'Dispatch du covoiturage non installé';
  end if;
  execute updated;
end;
$$;

-- Affectation : jamais plus de trois places, même sous acceptations
-- concurrentes (le chauffeur est verrouillé avant le décompte).
create or replace function private.guard_alpha_assignment()
returns trigger language plpgsql security definer set search_path = public
as $$
declare taken integer; trip uuid;
begin
  if old.status = 'requested' and new.status = 'accepted' then
    if now() >= old.created_at + make_interval(secs => coalesce(
      (select value::text::integer from public.app_config where key = 'dispatch_timeout_s'), 180)) then
      raise exception 'Recherche expirée' using errcode = '22023';
    end if;
    perform 1 from public.drivers where id = new.driver_id for update;
    taken := private.shared_seats_taken(new.driver_id, new.id);
    if new.category <> 'covoiturage' then
      if taken is null or taken > 0 then
        raise exception 'Une course est en cours pour ce chauffeur' using errcode = '22023';
      end if;
      return new;
    end if;
    if taken is null then
      raise exception 'Une course est en cours pour ce chauffeur' using errcode = '22023';
    end if;
    if taken + new.seats > private.shared_setting('seats', 3) then
      raise exception 'Plus assez de places dans ce covoiturage' using errcode = '22023';
    end if;
    select id into trip from public.shared_trips where driver_id = new.driver_id and status = 'open';
    if trip is null then
      insert into public.shared_trips(driver_id) values (new.driver_id) returning id into trip;
    end if;
    new.shared_trip_id := trip;
  end if;
  return new;
end;
$$;

create function private.close_shared_trip()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.shared_trip_id is not null
    and new.status not in ('accepted','enroute','arrived','started')
    and not exists (select 1 from public.rides where shared_trip_id = new.shared_trip_id
      and status in ('accepted','enroute','arrived','started')) then
    update public.shared_trips set status = 'closed', closed_at = now()
      where id = new.shared_trip_id and status = 'open';
  end if;
  return null;
end;
$$;
revoke all on function private.close_shared_trip() from public, anon, authenticated;
create trigger rides_close_shared_trip after update of status on public.rides
  for each row execute function private.close_shared_trip();

-- Une position envoyée pour une course vaut pour les autres passagers à bord
-- ou attendus : chacun suit le véhicule depuis sa propre course.
create function private.share_trip_location()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  insert into public.ride_locations(ride_id, driver_id, geom, recorded_at, sample_id)
    select o.id, new.driver_id, new.geom, new.recorded_at,
      case when new.sample_id is null then null else new.sample_id || ':' || left(o.id::text, 8) end
    from public.rides r join public.rides o on o.shared_trip_id = r.shared_trip_id
      and o.id <> r.id and o.status in ('accepted','enroute','arrived','started')
    where r.id = new.ride_id and r.shared_trip_id is not null;
  return null;
end;
$$;
revoke all on function private.share_trip_location() from public, anon, authenticated;
create trigger ride_locations_share_trip after insert on public.ride_locations
  for each row execute function private.share_trip_location();

-- Le chauffeur active ou coupe le covoiturage.
create function public.set_shared_rides(p_enabled boolean)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  update public.drivers set shared_enabled = coalesce(p_enabled, false) where id = auth.uid();
  if not found then raise exception 'Compte chauffeur requis' using errcode = '42501'; end if;
  return coalesce(p_enabled, false);
end;
$$;
revoke all on function public.set_shared_rides(boolean) from public, anon;
grant execute on function public.set_shared_rides(boolean) to authenticated;

-- Confidentialité : un passager ne voit des autres que l'ordre des arrêts.
-- Ordre indicatif : prises en charge en attente, puis déposes au plus court.
create function public.shared_trip_progress(p_ride uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare r public.rides;
begin
  select * into r from public.rides where id = p_ride;
  if not found or r.client_id is distinct from auth.uid() then
    raise exception 'Course introuvable' using errcode = '42501';
  end if;
  if r.shared_trip_id is null then
    return jsonb_build_object('seats_taken', r.seats, 'stops', '[]'::jsonb);
  end if;
  return (
    with mates as (
      select * from public.rides where shared_trip_id = r.shared_trip_id
        and status in ('accepted','enroute','arrived','started','completed')
    ), steps as (
      select 0 as phase, accepted_at as at, 0 as distance, id = r.id as mine,
        'pickup' as kind, status in ('started','completed') as done from mates
      union all
      select 1, started_at, coalesce(distance_est_m, 0), id = r.id, 'dropoff', status = 'completed'
        from mates
    )
    select jsonb_build_object(
      'seats_taken', (select coalesce(sum(seats), 0) from mates where status <> 'completed'),
      'seats_total', private.shared_setting('seats', 3),
      'stops', coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'mine', mine, 'done', done)
        order by done desc, phase, distance, at), '[]'::jsonb))
    from steps);
end;
$$;
revoke all on function public.shared_trip_progress(uuid) from public, anon;
grant execute on function public.shared_trip_progress(uuid) to authenticated;

-- L'offre annonce le covoiturage et le nombre de places avant acceptation.
do $$
declare definition text; updated text;
begin
  definition := pg_get_functiondef('public.offer_details(uuid)'::regprocedure);
  updated := regexp_replace(definition, '''payment_method'',\s+v_ride\.payment_method',
    '''payment_method'', v_ride.payment_method, ''seats'', v_ride.seats,
    ''shared_seats_taken'', private.shared_seats_taken(auth.uid(), v_ride.id)');
  if updated = definition then raise exception 'Détail d''offre non étendu'; end if;
  execute updated;
end;
$$;

notify pgrst, 'reload schema';
