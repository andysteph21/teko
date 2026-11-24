-- Lot R5 (arbitrages A16 à A18 du 23 novembre 2026) : livraison de colis en
-- voiture ou en moto. Type de service sur la course : cycle de vie, dispatch,
-- suivi et finance sont réutilisés. Fermé côté serveur tant que le cabinet
-- juridique n'a pas rendu son avis : delivery.enabled.

insert into public.app_config(key, value) values ('delivery',
  '{"enabled":false,"code_attempts":5,"recipient_retention_days":30}'::jsonb)
  on conflict (key) do nothing;

alter table public.rides add column service_type text not null default 'ride'
  check (service_type in ('ride','delivery'));
alter table public.ride_quotes add column service_type text not null default 'ride'
  check (service_type in ('ride','delivery'));
alter table public.pricing_rules add column service_type text not null default 'ride'
  check (service_type in ('ride','delivery'));
alter table public.drivers add column delivery_enabled boolean not null default false;

-- Grille provisoire de livraison, à confirmer par le porteur.
insert into public.pricing_rules(category, zone_id, base_fare, per_km, per_min, min_fare, service_type)
select v.category, null, v.base_fare, v.per_km, 0, v.min_fare, 'delivery'
from (values ('eco'::public.vehicle_category, 500, 200, 1000),
             ('moto'::public.vehicle_category, 300, 150, 700)) as v(category, base_fare, per_km, min_fare)
where exists (select 1 from public.pricing_rules)
  and not exists (select 1 from public.pricing_rules where service_type = 'delivery');

-- Le prix d'une course ne lit jamais la grille de livraison.
do $$
declare definition text; updated text;
begin
  definition := pg_get_functiondef(
    'public.estimate_price(public.vehicle_category,integer,integer,uuid)'::regprocedure);
  updated := replace(definition, 'where category = p_category and',
    'where category = p_category and service_type = ''ride'' and');
  if updated = definition then raise exception 'Grille de course non isolée'; end if;
  execute updated;
end;
$$;

-- La modification de trajet et l'attente aux arrêts restent propres aux
-- courses : elles ne lisent pas la grille de livraison.
do $$
declare definition text; updated text; target text;
begin
  foreach target in array array['public.route_change_origin(uuid,uuid)',
    'public.create_route_change_quote(uuid,uuid,jsonb,jsonb,jsonb)'] loop
    definition := pg_get_functiondef(target::regprocedure);
    updated := replace(definition, 'r.category = ''covoiturage''',
      '(r.category = ''covoiturage'' or r.service_type = ''delivery'')');
    if updated = definition then raise exception 'Modification de trajet non fermée aux livraisons'; end if;
    execute updated;
  end loop;
  definition := pg_get_functiondef('public.leave_stop(uuid)'::regprocedure);
  updated := replace(definition, 'from public.pricing_rules where category = r.category',
    'from public.pricing_rules where category = r.category and service_type = ''ride''');
  if updated = definition then raise exception 'Attente aux arrêts non isolée de la livraison'; end if;
  execute updated;
end;
$$;

create function public.estimate_delivery_price(
  p_category public.vehicle_category, p_distance_m integer, p_duration_s integer,
  p_zone uuid default null
) returns numeric language plpgsql stable set search_path = public
as $$
declare r public.pricing_rules; v numeric;
begin
  select * into r from public.pricing_rules
   where category = p_category and service_type = 'delivery'
     and (zone_id = p_zone or zone_id is null)
   order by (zone_id = p_zone) desc nulls last, valid_from desc limit 1;
  if r is null then return null; end if;
  v := r.base_fare + r.per_km * (p_distance_m::numeric / 1000.0)
     + r.per_min * (p_duration_s::numeric / 60.0);
  v := greatest(private.round_cash_amount(v), ceil(r.min_fare / 25) * 25);
  if r.max_fare is not null then v := least(v, floor(r.max_fare / 25) * 25); end if;
  return v;
end;
$$;

create or replace function public._create_ride_quote(
  p_client uuid, p_category public.vehicle_category, p_origin extensions.geometry,
  p_dest extensions.geometry, p_distance_m integer, p_duration_s integer, p_shape text,
  p_options jsonb default '{}'::jsonb
) returns public.ride_quotes language plpgsql security definer set search_path = public
as $$
declare q public.ride_quotes; zone uuid; ttl integer; price numeric;
  seats integer := coalesce((p_options->>'seats')::integer, 1);
  service text := coalesce(p_options->>'service', 'ride');
begin
  if not exists (select 1 from public.profiles where id = p_client and role = 'client'
    and deleted_at is null) then
    raise exception 'Compte passager requis' using errcode = '42501';
  end if;
  if p_category not in ('eco','moto','confort','covoiturage') or p_shape is null or p_shape = ''
    or service not in ('ride','delivery') then
    raise exception 'Itinéraire invalide' using errcode = '22023';
  end if;
  if seats < 1 or seats > private.shared_setting('seats', 3)
    or (seats > 1 and p_category <> 'covoiturage') then
    raise exception 'Nombre de places invalide' using errcode = '22023';
  end if;
  if service = 'delivery' and p_category not in ('eco','moto') then
    raise exception 'Véhicule de livraison invalide' using errcode = '22023';
  end if;
  if (p_category = 'covoiturage' and not coalesce((select (value->>'enabled')::boolean
      from public.app_config where key = 'shared_ride'), false))
    or (service = 'delivery' and not coalesce((select (value->>'enabled')::boolean
      from public.app_config where key = 'delivery'), false)) then
    raise exception 'Service non ouvert' using errcode = '22023';
  end if;
  select id into zone from public.zones where is_active and extensions.st_contains(geom, p_origin) limit 1;
  if zone is null then raise exception 'Départ hors zone de service' using errcode = '22023'; end if;
  select (value #>> '{}')::integer into ttl from public.app_config where key = 'quote_ttl_s';
  if ttl is null or ttl <= 0 then raise exception 'Validité des devis non configurée'; end if;
  price := case when service = 'delivery'
    then public.estimate_delivery_price(p_category, p_distance_m, p_duration_s, zone)
    else public.estimate_price(p_category, p_distance_m, p_duration_s, zone) * seats end;
  if price is null then raise exception 'Tarif non configuré' using errcode = '22023'; end if;
  insert into public.ride_quotes(client_id, category, origin_geom, dest_geom,
    distance_m, duration_s, price, route_shape, expires_at, seats, service_type)
  values (p_client, p_category, p_origin, p_dest, p_distance_m, p_duration_s,
    price, p_shape, now() + make_interval(secs => ttl), seats, service) returning * into q;
  return q;
end;
$$;

do $$
declare definition text; updated text;
begin
  definition := pg_get_functiondef('private.request_quoted_ride(uuid,text,text,uuid,uuid,uuid)'::regprocedure);
  updated := replace(replace(definition, 'payment_method,seats)', 'payment_method,seats,service_type)'),
    '''cash'',q.seats)', '''cash'',q.seats,q.service_type)');
  if position('q.service_type' in updated) = 0 or position('seats,service_type)' in updated) = 0 then
    raise exception 'Type de service non reporté sur la course';
  end if;
  execute updated;
end;
$$;

create table public.ride_parcels (
  ride_id uuid primary key references public.rides(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 200),
  size text not null check (size in ('small','medium','large')),
  recipient_name text not null check (char_length(recipient_name) between 1 and 80),
  recipient_phone text not null check (recipient_phone ~ '^[0-9]{8,15}$' or recipient_phone = ''),
  photo_path text,
  delivered_at timestamptz,
  erased_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.ride_parcels enable row level security;
revoke all on public.ride_parcels from public, anon, authenticated;
grant select on public.ride_parcels to authenticated;
grant all on public.ride_parcels to service_role;
-- Les coordonnées du destinataire ne sont visibles que de l'expéditeur, du
-- coursier affecté et des opérations.
create policy ride_parcels_read on public.ride_parcels for select to authenticated
  using (exists (select 1 from public.rides r where r.id = ride_id
    and (r.client_id = auth.uid() or r.driver_id = auth.uid()
      or public.is_superadmin() or (public.is_admin() and public.has_admin_role('ops')))));

create table private.parcel_codes (
  ride_id uuid primary key references public.rides(id) on delete cascade,
  code text not null,
  failed_attempts integer not null default 0,
  blocked_until timestamptz
);
revoke all on private.parcel_codes from public, anon, authenticated;

-- Une livraison ne naît que par request_delivery, avec son colis.
create function private.guard_delivery_request()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.service_type = 'delivery'
    and coalesce(current_setting('teko.delivery_request', true), '') <> '1' then
    raise exception 'Détails du colis requis' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_delivery_request() from public, anon, authenticated;
create trigger rides_delivery_request before insert on public.rides
  for each row execute function private.guard_delivery_request();

create function public.request_delivery(
  p_quote uuid, p_parcel jsonb, p_origin_hint text default null, p_dest_hint text default null,
  p_origin_landmark uuid default null, p_dest_landmark uuid default null
) returns public.rides language plpgsql security definer set search_path = public
as $$
declare r public.rides; q public.ride_quotes;
  phone text := regexp_replace(coalesce(p_parcel->>'recipient_phone', ''), '\D', '', 'g');
begin
  select * into q from public.ride_quotes where id = p_quote;
  if not found or q.client_id is distinct from auth.uid() then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;
  if q.service_type <> 'delivery' then
    raise exception 'Devis de livraison requis' using errcode = '22023';
  end if;
  if not coalesce((select (value->>'enabled')::boolean from public.app_config
    where key = 'delivery'), false) then
    raise exception 'Service non ouvert' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_parcel->>'description'), '')) not between 1 and 200
    or coalesce(p_parcel->>'size', '') not in ('small','medium','large')
    or char_length(coalesce(trim(p_parcel->>'recipient_name'), '')) not between 1 and 80
    or phone !~ '^[0-9]{8,15}$' then
    raise exception 'Détails du colis invalides' using errcode = '22023';
  end if;
  if q.ride_id is not null then
    select * into r from public.rides where id = q.ride_id;
    return r;
  end if;
  perform set_config('teko.delivery_request', '1', true);
  r := private.request_quoted_ride(p_quote, p_origin_hint, p_dest_hint, p_origin_landmark,
    p_dest_landmark, null);
  perform set_config('teko.delivery_request', '', true);
  insert into public.ride_parcels(ride_id, description, size, recipient_name, recipient_phone)
    values (r.id, trim(p_parcel->>'description'), p_parcel->>'size',
      trim(p_parcel->>'recipient_name'), phone);
  insert into private.parcel_codes(ride_id, code)
    values (r.id, lpad((floor(random() * 10000))::integer::text, 4, '0'));
  return r;
end;
$$;
revoke all on function public.request_delivery(uuid, jsonb, text, text, uuid, uuid) from public, anon;
grant execute on function public.request_delivery(uuid, jsonb, text, text, uuid, uuid) to authenticated;

-- Le code de remise n'est lisible que de l'expéditeur, qui le transmet au destinataire.
create function public.delivery_code(p_ride uuid)
returns text language plpgsql stable security definer set search_path = public
as $$
declare result text;
begin
  select c.code into result from private.parcel_codes c join public.rides r on r.id = c.ride_id
    where r.id = p_ride and r.client_id = auth.uid();
  if not found then raise exception 'Livraison introuvable' using errcode = '42501'; end if;
  return result;
end;
$$;
revoke all on function public.delivery_code(uuid) from public, anon;
grant execute on function public.delivery_code(uuid) to authenticated;

-- Dispatch : seuls les chauffeurs ayant activé la livraison, voiture ou moto.
create or replace function private.driver_serves(p_driver uuid, p_ride uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select case
    when r.service_type = 'delivery' then d.delivery_enabled and case when r.category = 'moto'
      then 'moto' = any(d.categories)
      else d.categories && array['eco','confort']::public.vehicle_category[] end
    when r.category = 'covoiturage'
      then d.shared_enabled and d.categories && array['eco','confort']::public.vehicle_category[]
    else r.category = any(d.categories) end
  from public.drivers d, public.rides r where d.id = p_driver and r.id = p_ride;
$$;

create function public.set_delivery_enabled(p_enabled boolean)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  update public.drivers set delivery_enabled = coalesce(p_enabled, false) where id = auth.uid();
  if not found then raise exception 'Compte chauffeur requis' using errcode = '42501'; end if;
  return coalesce(p_enabled, false);
end;
$$;
revoke all on function public.set_delivery_enabled(boolean) from public, anon;
grant execute on function public.set_delivery_enabled(boolean) to authenticated;

-- Preuve photo : déposée par le coursier affecté, dans le dossier de la course.
insert into storage.buckets(id, name, public) values ('delivery-proofs', 'delivery-proofs', false)
  on conflict (id) do nothing;
create policy delivery_proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'delivery-proofs' and exists (select 1 from public.rides r
    where r.id::text = (storage.foldername(name))[1] and r.driver_id = auth.uid()
      and r.service_type = 'delivery' and r.status = 'started'));
create policy delivery_proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'delivery-proofs' and (public.is_superadmin()
    or (public.is_admin() and public.has_admin_role('ops'))
    or exists (select 1 from public.rides r where r.id::text = (storage.foldername(name))[1]
      and (r.driver_id = auth.uid() or r.client_id = auth.uid()))));

-- Remise : code du destinataire ET photo du colis remis (arbitrage A17).
create function public.complete_delivery(p_ride uuid, p_code text, p_photo_path text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare r public.rides; secret private.parcel_codes; attempts integer; blocked timestamptz;
  max_attempts integer := coalesce((select (value->>'code_attempts')::integer
    from public.app_config where key = 'delivery'), 5);
begin
  select * into r from public.rides where id = p_ride for update;
  if not found or r.driver_id is distinct from auth.uid() or r.service_type <> 'delivery' then
    raise exception 'Action réservée au coursier affecté' using errcode = '42501';
  end if;
  if r.status <> 'started' then
    raise exception 'Transition invalide depuis le statut %', r.status;
  end if;
  if p_photo_path is null or (storage.foldername(p_photo_path))[1] is distinct from p_ride::text
    or not exists (select 1 from storage.objects where bucket_id = 'delivery-proofs'
      and name = p_photo_path) then
    raise exception 'Photo de remise requise' using errcode = '22023';
  end if;
  select * into secret from private.parcel_codes where ride_id = p_ride for update;
  if not found then raise exception 'Code indisponible'; end if;
  if secret.blocked_until > now() then
    return jsonb_build_object('error', 'code_blocked', 'retry_after_s',
      ceil(extract(epoch from secret.blocked_until - now())));
  end if;
  if p_code is null or p_code is distinct from secret.code then
    attempts := case when secret.blocked_until is not null then 1 else secret.failed_attempts + 1 end;
    blocked := case when attempts >= max_attempts then now() + interval '5 minutes' else null end;
    update private.parcel_codes set failed_attempts = attempts, blocked_until = blocked
      where ride_id = p_ride;
    insert into public.ride_events(ride_id, type, actor, meta) values (p_ride, 'delivery_code_failed',
      auth.uid(), jsonb_build_object('attempt', attempts, 'blocked', blocked is not null));
    return jsonb_build_object('error', case when blocked is null then 'code_incorrect' else 'code_blocked' end,
      'attempts_remaining', greatest(0, max_attempts - attempts),
      'retry_after_s', case when blocked is null then 0 else 300 end);
  end if;
  update private.parcel_codes set failed_attempts = 0, blocked_until = null where ride_id = p_ride;
  update public.ride_parcels set photo_path = p_photo_path, delivered_at = now() where ride_id = p_ride;
  r := public._complete_ride(p_ride, null);
  insert into public.ride_events(ride_id, type, actor) values (p_ride, 'delivered', auth.uid());
  return jsonb_build_object('ride', to_jsonb(r));
end;
$$;
revoke all on function public.complete_delivery(uuid, text, text) from public, anon;
grant execute on function public.complete_delivery(uuid, text, text) to authenticated;

-- Aucune livraison ne se termine sans sa preuve, par aucun autre chemin.
create function private.require_delivery_proof()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' and new.service_type = 'delivery'
    and not exists (select 1 from public.ride_parcels where ride_id = new.id
      and delivered_at is not null and photo_path is not null) then
    raise exception 'Preuve de remise requise' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.require_delivery_proof() from public, anon, authenticated;
create trigger rides_delivery_proof before update of status on public.rides
  for each row execute function private.require_delivery_proof();

-- La clôture automatique ne termine jamais une livraison sans preuve.
do $$
declare definition text; updated text;
begin
  definition := pg_get_functiondef('public.auto_complete_stale_rides()'::regprocedure);
  updated := replace(definition, 'where status = ''started'' and driver_id is not null',
    'where status = ''started'' and service_type = ''ride'' and driver_id is not null');
  if updated = definition then raise exception 'Clôture automatique non restreinte aux courses'; end if;
  execute updated;
end;
$$;

-- L'offre annonce la livraison et la taille du colis, jamais le destinataire.
do $$
declare definition text; updated text;
begin
  definition := pg_get_functiondef('public.offer_details(uuid)'::regprocedure);
  updated := replace(definition, '''seats'', v_ride.seats,',
    '''seats'', v_ride.seats, ''service_type'', v_ride.service_type,
    ''parcel_size'', (select size from public.ride_parcels where ride_id = v_ride.id),');
  if updated = definition then raise exception 'Détail d''offre non étendu à la livraison'; end if;
  execute updated;
end;
$$;

-- Rétention : coordonnées du destinataire effacées après le délai configuré.
create function public.purge_parcel_recipients()
returns integer language plpgsql security definer set search_path = public
as $$
declare total integer;
begin
  with gone as (
    update public.ride_parcels p set recipient_name = 'effacé', recipient_phone = '', erased_at = now()
      from public.rides r
      where r.id = p.ride_id and p.erased_at is null and r.completed_at is not null
        and r.completed_at < now() - make_interval(days => coalesce((select
          (value->>'recipient_retention_days')::integer from public.app_config
          where key = 'delivery'), 30))
      returning 1)
  select count(*) into total from gone;
  return total;
end;
$$;
revoke all on function public.purge_parcel_recipients() from public, anon, authenticated;
select cron.schedule('teko-alpha-parcel-retention', '20 3 * * *', 'select public.purge_parcel_recipients();');

notify pgrst, 'reload schema';
