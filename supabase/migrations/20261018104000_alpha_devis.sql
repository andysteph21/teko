-- Devis serveur figé, propriétaire identifié, consommation unique et rejouable.
insert into public.app_config(key,value,description) values
  ('quote_ttl_s','300','Validité du devis avant commande : 5 min, décision du 18 octobre 2026'),
  ('dispatch_timeout_s','180','Recherche chauffeur : 3 min, décision du 18 octobre 2026')
on conflict (key) do nothing;

create table public.ride_quotes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  category public.vehicle_category not null,
  origin_geom extensions.geometry(Point,4326) not null,
  dest_geom extensions.geometry(Point,4326) not null,
  distance_m integer not null check (distance_m > 0),
  duration_s integer not null check (duration_s > 0),
  price numeric(12,2) not null check (price > 0),
  route_shape text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ride_id uuid unique references public.rides(id)
);
alter table public.ride_quotes enable row level security;
revoke all on public.ride_quotes from anon, authenticated;
grant select on public.ride_quotes to authenticated;
grant all on public.ride_quotes to service_role;
create policy quotes_read_owner on public.ride_quotes for select to authenticated
  using (client_id = auth.uid());

-- Cette fonction reçoit les distances calculées par l'Edge Function, jamais
-- celles d'un appareil. EXECUTE réservé au compte serveur.
create function public.create_ride_quote(
  p_client uuid, p_category public.vehicle_category,
  p_origin extensions.geometry, p_dest extensions.geometry,
  p_distance_m integer, p_duration_s integer, p_shape text
) returns public.ride_quotes language plpgsql security definer
set search_path = public, extensions
as $$
declare q public.ride_quotes; zone uuid; ttl integer;
begin
  if not exists (select 1 from public.profiles where id=p_client and role='client'
    and deleted_at is null) then
    raise exception 'Compte passager requis' using errcode='42501';
  end if;
  if p_category not in ('eco','moto','confort') or p_shape is null or p_shape='' then
    raise exception 'Itinéraire invalide' using errcode='22023';
  end if;
  select id into zone from public.zones where is_active and st_contains(geom,p_origin) limit 1;
  if zone is null then raise exception 'Départ hors zone de service' using errcode='22023'; end if;
  select (value #>> '{}')::integer into ttl from public.app_config where key='quote_ttl_s';
  if ttl is null or ttl <= 0 then raise exception 'Validité des devis non configurée'; end if;
  insert into public.ride_quotes(client_id,category,origin_geom,dest_geom,
    distance_m,duration_s,price,route_shape,expires_at)
  values (p_client,p_category,p_origin,p_dest,p_distance_m,p_duration_s,
    public.estimate_price(p_category,p_distance_m,p_duration_s,zone),p_shape,
    now()+make_interval(secs=>ttl)) returning * into q;
  return q;
end;
$$;
revoke all on function public.create_ride_quote(uuid,public.vehicle_category,
  extensions.geometry,extensions.geometry,integer,integer,text) from public, anon, authenticated;
grant execute on function public.create_ride_quote(uuid,public.vehicle_category,
  extensions.geometry,extensions.geometry,integer,integer,text) to service_role;

-- L'ancien contrat fait confiance à des métriques de l'app : il n'est plus
-- accessible aux utilisateurs. Conservé pour les migrations/tests historiques.
revoke execute on function public.request_ride(public.vehicle_category,
  extensions.geometry,extensions.geometry,integer,integer,timestamptz,
  public.payment_method,uuid,uuid,text,text) from public,anon,authenticated;

create function public.request_quoted_ride(
  p_quote uuid, p_origin_hint text default null, p_dest_hint text default null,
  p_origin_landmark uuid default null, p_dest_landmark uuid default null
) returns public.rides language plpgsql security definer
set search_path = public, extensions
as $$
declare q public.ride_quotes; r public.rides; meeting uuid;
begin
  -- Verrou par passager : deux devis concurrents ne créent pas deux courses.
  perform 1 from public.profiles where id=auth.uid() and role='client'
    and deleted_at is null for update;
  if not found then raise exception 'Compte passager requis' using errcode='42501'; end if;
  select * into q from public.ride_quotes where id=p_quote for update;
  if not found or q.client_id is distinct from auth.uid() then
    raise exception 'Devis introuvable' using errcode='42501';
  end if;
  if q.ride_id is not null then
    select * into r from public.rides where id=q.ride_id;
    return r;
  end if;
  if q.expires_at <= now() then raise exception 'Devis expiré' using errcode='22023'; end if;
  if exists (select 1 from public.rides where client_id=auth.uid()
    and status in ('requested','accepted','enroute','arrived','started')) then
    raise exception 'Une course est en cours' using errcode='22023';
  end if;
  select id into meeting from public.landmarks where status='validated'
    and st_dwithin(geom::geography,q.origin_geom::geography,300)
    order by salience desc,geom <-> q.origin_geom limit 1;
  insert into public.rides(client_id,category,status,origin_geom,dest_geom,
    origin_landmark_id,dest_landmark_id,origin_hint,dest_hint,meeting_landmark_id,
    distance_est_m,duration_est_s,price_est,payment_method)
  values (q.client_id,q.category,'requested',q.origin_geom,q.dest_geom,
    p_origin_landmark,p_dest_landmark,p_origin_hint,p_dest_hint,meeting,
    q.distance_m,q.duration_s,q.price,'cash') returning * into r;
  update public.ride_quotes set ride_id=r.id where id=q.id;
  insert into public.ride_events(ride_id,type,actor,meta)
    values(r.id,'requested',auth.uid(),jsonb_build_object('quote_id',q.id,'price_est',q.price));
  return r;
end;
$$;
revoke all on function public.request_quoted_ride(uuid,text,text,uuid,uuid) from public,anon;
grant execute on function public.request_quoted_ride(uuid,text,text,uuid,uuid) to authenticated,service_role;
notify pgrst, 'reload schema';
