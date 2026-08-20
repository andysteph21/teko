-- ============================================================================
-- Teko — 0017 : Dispatch par offres nominatives (écart E-01, maquette D-10)
--
-- Chaînon manquant entre request_ride et accept_ride : présence chauffeur
-- (heartbeat), offres nominatives avec compte à rebours (12 s, config) et
-- cascade séquentielle vers le chauffeur éligible suivant. La cascade est
-- invisible côté client ; la destination reste cachée au chauffeur tant
-- qu'il n'a pas accepté (anti-écrémage) : les détails d'offre passent par
-- offer_details(), jamais par un SELECT sur rides.
-- ============================================================================

insert into public.app_config (key, value, description) values
  ('offer_timeout_s',    '12',  'Durée de validité d''une offre chauffeur (secondes).'),
  ('presence_ttl_s',     '300', 'Fraîcheur maximale du heartbeat pour être éligible au dispatch (secondes).'),
  ('scheduled_lead_min', '15',  'Avance de déclenchement du dispatch pour une course planifiée (minutes).')
on conflict (key) do nothing;

create type public.offer_status as enum ('pending','accepted','declined','expired','cancelled');

-- ----------------------------------------------------------------------------
-- Présence chauffeur (heartbeat du toggle « en ligne » D-09)
-- ----------------------------------------------------------------------------
create table public.driver_presence (
  driver_id  uuid primary key references public.drivers(id) on delete cascade,
  geom       extensions.geometry(Point, 4326) not null,
  updated_at timestamptz not null default now()
);
create index driver_presence_geom_gix on public.driver_presence using gist (geom);

alter table public.driver_presence enable row level security;
create policy "presence_rw_self" on public.driver_presence
  for all using ( driver_id = auth.uid() ) with check ( driver_id = auth.uid() );
create policy "presence_select_admin" on public.driver_presence
  for select using ( public.is_admin() );

create or replace function public.driver_heartbeat(p_point extensions.geometry)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_d public.drivers;
begin
  select * into v_d from public.drivers where id = auth.uid();
  if v_d is null or v_d.kyc_status <> 'validated' or not v_d.is_active then
    raise exception 'Chauffeur non autorisé (KYC/activation)';
  end if;
  insert into public.driver_presence (driver_id, geom, updated_at)
  values (auth.uid(), p_point, now())
  on conflict (driver_id) do update set geom = excluded.geom, updated_at = now();
end;
$$;

-- ----------------------------------------------------------------------------
-- Offres
-- ----------------------------------------------------------------------------
create table public.ride_offers (
  id           uuid primary key default gen_random_uuid(),
  ride_id      uuid not null references public.rides(id) on delete cascade,
  driver_id    uuid not null references public.drivers(id) on delete cascade,
  rank         integer not null,
  status       public.offer_status not null default 'pending',
  offered_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  responded_at timestamptz,
  unique (ride_id, driver_id)
);
create index ride_offers_pending_idx on public.ride_offers (status, expires_at) where status = 'pending';
create index ride_offers_ride_idx on public.ride_offers (ride_id, rank);

alter table public.ride_offers enable row level security;
-- Chauffeur : ses offres. Admin : tout. Client : rien (cascade invisible).
create policy "offers_select_driver_or_admin" on public.ride_offers
  for select using ( driver_id = auth.uid() or public.is_admin() );

-- ----------------------------------------------------------------------------
-- Cascade : offrir au prochain chauffeur éligible
-- Éligible = actif + KYC validé + catégorie + heartbeat frais + jamais offert
-- sur cette course. Ordre : distance au point de départ.
-- ----------------------------------------------------------------------------
create or replace function public.offer_next_driver(p_ride uuid)
returns public.ride_offers
language plpgsql security definer set search_path = public
as $$
declare
  v_ride    public.rides;
  v_driver  uuid;
  v_offer   public.ride_offers;
  v_timeout integer := coalesce((select value::text::int from public.app_config where key = 'offer_timeout_s'), 12);
  v_ttl     integer := coalesce((select value::text::int from public.app_config where key = 'presence_ttl_s'), 300);
begin
  select * into v_ride from public.rides where id = p_ride for update;
  if v_ride is null or v_ride.status <> 'requested' or v_ride.driver_id is not null then
    return null;
  end if;

  select d.id into v_driver
    from public.drivers d
    join public.driver_presence p on p.driver_id = d.id
   where d.is_active
     and d.kyc_status = 'validated'
     and v_ride.category = any (d.categories)
     and p.updated_at > now() - make_interval(secs => v_ttl)
     and not exists (select 1 from public.ride_offers o
                      where o.ride_id = p_ride and o.driver_id = d.id)
   order by extensions.st_distance(p.geom::extensions.geography,
                                   v_ride.origin_geom::extensions.geography)
   limit 1;

  if v_driver is null then
    -- Cascade épuisée (ou personne en ligne) : le client est prévenu,
    -- la course reste 'requested' (il peut annuler sans frais).
    if not exists (select 1 from public.ride_offers o
                    where o.ride_id = p_ride and o.status = 'pending') then
      insert into public.ride_events (ride_id, type, meta)
      values (p_ride, 'dispatch_exhausted', '{}');
      perform public.enqueue_notification(v_ride.client_id, 'no_driver_found',
        jsonb_build_object('ride_id', p_ride));
    end if;
    return null;
  end if;

  insert into public.ride_offers (ride_id, driver_id, rank, expires_at)
  values (p_ride, v_driver,
          coalesce((select max(rank) from public.ride_offers where ride_id = p_ride), 0) + 1,
          now() + make_interval(secs => v_timeout))
  returning * into v_offer;

  insert into public.ride_events (ride_id, type, meta)
  values (p_ride, 'offer_sent', jsonb_build_object('driver_id', v_driver, 'rank', v_offer.rank));
  perform public.enqueue_notification(v_driver, 'ride_offer',
    jsonb_build_object('offer_id', v_offer.id, 'ride_id', p_ride, 'expires_at', v_offer.expires_at));
  return v_offer;
end;
$$;
revoke execute on function public.offer_next_driver(uuid) from public, anon, authenticated;
grant execute on function public.offer_next_driver(uuid) to service_role;

-- Dispatch automatique à la création d'une course immédiate.
create or replace function public._dispatch_after_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.offer_next_driver(new.id);
  return new;
end;
$$;
create trigger rides_dispatch_on_insert
  after insert on public.rides
  for each row when (new.status = 'requested' and new.scheduled_at is null)
  execute function public._dispatch_after_insert();

-- ----------------------------------------------------------------------------
-- Détails d'offre pour la modale D-10 — SANS destination (anti-écrémage).
-- ----------------------------------------------------------------------------
create or replace function public.offer_details(p_offer uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v_off public.ride_offers; v_ride public.rides;
begin
  select * into v_off from public.ride_offers where id = p_offer and driver_id = auth.uid();
  if v_off is null then raise exception 'Offre introuvable'; end if;
  select * into v_ride from public.rides where id = v_off.ride_id;
  return jsonb_build_object(
    'offer_id',        v_off.id,
    'status',          v_off.status,
    'expires_at',      v_off.expires_at,
    'category',        v_ride.category,
    'origin',          extensions.st_asgeojson(v_ride.origin_geom)::jsonb,
    'origin_landmark', (select name from public.landmarks where id = v_ride.origin_landmark_id),
    'origin_hint',     v_ride.origin_hint,
    'meeting_landmark',(select name from public.landmarks where id = v_ride.meeting_landmark_id),
    'distance_est_m',  v_ride.distance_est_m,
    'duration_est_s',  v_ride.duration_est_s,
    'price_est',       v_ride.price_est,
    'commission',      public.commission_amount(v_ride.price_est),
    'net_driver',      v_ride.price_est - public.commission_amount(v_ride.price_est),
    'payment_method',  v_ride.payment_method
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Réponse du chauffeur à son offre (accepter / décliner)
-- ----------------------------------------------------------------------------
create or replace function public.respond_offer(p_offer uuid, p_accept boolean)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare v_off public.ride_offers; v_ride public.rides; v_d public.drivers;
begin
  select * into v_off from public.ride_offers where id = p_offer for update;
  if v_off is null or v_off.driver_id <> auth.uid() then
    raise exception 'Offre introuvable';
  end if;
  if v_off.status <> 'pending' then
    raise exception 'Offre déjà traitée (statut %)', v_off.status;
  end if;
  if v_off.expires_at < now() then
    update public.ride_offers set status = 'expired', responded_at = now() where id = p_offer;
    perform public.offer_next_driver(v_off.ride_id);
    raise exception 'Offre expirée';
  end if;

  select * into v_d from public.drivers where id = auth.uid();
  if v_d is null or v_d.kyc_status <> 'validated' or not v_d.is_active then
    raise exception 'Chauffeur non autorisé (KYC/activation)';
  end if;

  if not p_accept then
    update public.ride_offers set status = 'declined', responded_at = now() where id = p_offer;
    insert into public.ride_events (ride_id, type, actor, meta)
    values (v_off.ride_id, 'offer_declined', auth.uid(), jsonb_build_object('rank', v_off.rank));
    perform public.offer_next_driver(v_off.ride_id);
    return null;
  end if;

  select * into v_ride from public.rides where id = v_off.ride_id for update;
  if v_ride.status <> 'requested' or v_ride.driver_id is not null then
    update public.ride_offers set status = 'cancelled', responded_at = now() where id = p_offer;
    raise exception 'Course non disponible (statut %)', v_ride.status;
  end if;

  update public.rides
     set driver_id = auth.uid(), status = 'accepted', accepted_at = now()
   where id = v_off.ride_id
   returning * into v_ride;
  update public.ride_offers set status = 'accepted', responded_at = now() where id = p_offer;

  insert into public.ride_events (ride_id, type, actor) values (v_ride.id, 'accepted', auth.uid());
  insert into public.notifications (user_id, type, payload)
  values (v_ride.client_id, 'ride_accepted', jsonb_build_object('ride_id', v_ride.id));
  return v_ride;
end;
$$;

-- accept_ride devient un raccourci : accepter SON offre en cours sur la course.
create or replace function public.accept_ride(p_ride uuid)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare v_offer uuid;
begin
  select id into v_offer
    from public.ride_offers
   where ride_id = p_ride and driver_id = auth.uid() and status = 'pending'
   order by offered_at desc limit 1;
  if v_offer is null then
    raise exception 'Aucune offre active pour cette course';
  end if;
  return public.respond_offer(v_offer, true);
end;
$$;

-- ----------------------------------------------------------------------------
-- Expiration des offres (job, cf. 0019) : cascade vers le suivant.
-- ----------------------------------------------------------------------------
create or replace function public.expire_stale_offers()
returns integer
language plpgsql security definer set search_path = public
as $$
declare r record; v_count integer := 0;
begin
  perform public.assert_admin_or_service();
  for r in select id, ride_id from public.ride_offers
            where status = 'pending' and expires_at < now()
            for update skip locked
  loop
    update public.ride_offers set status = 'expired', responded_at = now() where id = r.id;
    insert into public.ride_events (ride_id, type, meta)
    values (r.ride_id, 'offer_expired', jsonb_build_object('offer_id', r.id));
    perform public.offer_next_driver(r.ride_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
