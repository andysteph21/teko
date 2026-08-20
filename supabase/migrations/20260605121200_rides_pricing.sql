-- ============================================================================
-- Teko — 0013 : Tarification + cycle de vie des courses (RPC Postgres)
-- Toutes les RPC sont SECURITY DEFINER et vérifient l'identité via auth.uid().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Estimation de prix : choisit la règle de zone si dispo, sinon la règle globale
-- ----------------------------------------------------------------------------
create or replace function public.estimate_price(
  p_category public.vehicle_category,
  p_distance_m integer,
  p_duration_s integer,
  p_zone uuid default null
) returns numeric
language plpgsql stable security definer set search_path = public
as $$
declare r public.pricing_rules; v numeric;
begin
  select * into r
    from public.pricing_rules
   where category = p_category
     and (zone_id = p_zone or zone_id is null)
   order by (zone_id = p_zone) desc nulls last, valid_from desc
   limit 1;
  if r is null then return null; end if;
  v := r.base_fare
     + r.per_km  * (p_distance_m::numeric / 1000.0)
     + r.per_min * (p_duration_s::numeric / 60.0);
  return round(greatest(v, r.min_fare), 0);
end;
$$;

-- ----------------------------------------------------------------------------
-- Commander une course (client)
-- ----------------------------------------------------------------------------
create or replace function public.request_ride(
  p_category       public.vehicle_category,
  p_origin         extensions.geometry,
  p_dest           extensions.geometry,
  p_distance_m     integer,
  p_duration_s     integer,
  p_scheduled_at   timestamptz default null,
  p_payment_method public.payment_method default 'cash',
  p_origin_landmark uuid default null,
  p_dest_landmark   uuid default null,
  p_origin_hint     text default null,
  p_dest_hint       text default null
) returns public.rides
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_client uuid := auth.uid();
  v_zone uuid;
  v_price numeric;
  v_pin text;
  v_meeting uuid;
  v_ride public.rides;
begin
  if v_client is null then raise exception 'Authentification requise'; end if;

  select id into v_zone from public.zones
   where is_active and ST_Contains(geom, p_origin) limit 1;

  v_price := public.estimate_price(p_category, p_distance_m, p_duration_s, v_zone);
  v_pin   := lpad((floor(random()*10000))::int::text, 4, '0');

  -- point de rendez-vous suggéré : repère validé saillant proche du départ
  select id into v_meeting from public.landmarks
   where status = 'validated'
     and ST_DWithin(geom::geography, p_origin::geography, 300)
   order by salience desc, geom <-> p_origin
   limit 1;

  insert into public.rides (
    client_id, category, status, scheduled_at, origin_geom, dest_geom,
    origin_landmark_id, dest_landmark_id, origin_hint, dest_hint, meeting_landmark_id,
    distance_est_m, duration_est_s, price_est, payment_method, pin_code)
  values (
    v_client, p_category, 'requested', p_scheduled_at, p_origin, p_dest,
    p_origin_landmark, p_dest_landmark, p_origin_hint, p_dest_hint, v_meeting,
    p_distance_m, p_duration_s, v_price, p_payment_method, v_pin)
  returning * into v_ride;

  insert into public.ride_events (ride_id, type, actor, meta)
  values (v_ride.id, 'requested', v_client, jsonb_build_object('price_est', v_price));

  return v_ride;
end;
$$;

-- ----------------------------------------------------------------------------
-- Accepter une course (chauffeur)
-- ----------------------------------------------------------------------------
create or replace function public.accept_ride(p_ride uuid)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare v_driver uuid := auth.uid(); v_d public.drivers; v_ride public.rides;
begin
  select * into v_d from public.drivers where id = v_driver;
  if v_d is null or v_d.kyc_status <> 'validated' or not v_d.is_active then
    raise exception 'Chauffeur non autorisé (KYC/activation)';
  end if;

  select * into v_ride from public.rides where id = p_ride for update;
  if v_ride is null then raise exception 'Course introuvable'; end if;
  if v_ride.status <> 'requested' or v_ride.driver_id is not null then
    raise exception 'Course non disponible (statut %)', v_ride.status;
  end if;
  if not (v_ride.category = any (v_d.categories)) then
    raise exception 'Catégorie % non desservie par ce chauffeur', v_ride.category;
  end if;

  update public.rides
     set driver_id = v_driver, status = 'accepted', accepted_at = now()
   where id = p_ride
   returning * into v_ride;

  insert into public.ride_events (ride_id, type, actor) values (p_ride, 'accepted', v_driver);
  insert into public.notifications (user_id, type, payload)
  values (v_ride.client_id, 'ride_accepted', jsonb_build_object('ride_id', p_ride));
  return v_ride;
end;
$$;

-- ----------------------------------------------------------------------------
-- Transition générique réservée au chauffeur assigné
-- ----------------------------------------------------------------------------
create or replace function public._driver_transition(
  p_ride uuid, p_from public.ride_status[], p_to public.ride_status, p_event text
) returns public.rides
language plpgsql security definer set search_path = public
as $$
declare v_driver uuid := auth.uid(); v_ride public.rides;
begin
  select * into v_ride from public.rides where id = p_ride for update;
  if v_ride is null then raise exception 'Course introuvable'; end if;
  if v_ride.driver_id is distinct from v_driver then
    raise exception 'Action réservée au chauffeur assigné';
  end if;
  if not (v_ride.status = any (p_from)) then
    raise exception 'Transition invalide depuis le statut %', v_ride.status;
  end if;
  update public.rides set status = p_to where id = p_ride returning * into v_ride;
  insert into public.ride_events (ride_id, type, actor) values (p_ride, p_event, v_driver);
  return v_ride;
end;
$$;

create or replace function public.mark_arrived(p_ride uuid)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare v_ride public.rides;
begin
  v_ride := public._driver_transition(p_ride, array['accepted','enroute']::public.ride_status[], 'arrived', 'arrived');
  insert into public.notifications (user_id, type, payload)
  values (v_ride.client_id, 'driver_arrived', jsonb_build_object('ride_id', p_ride));
  return v_ride;
end;
$$;

-- ----------------------------------------------------------------------------
-- Démarrer la course : exige le code PIN du client
-- ----------------------------------------------------------------------------
create or replace function public.start_ride(p_ride uuid, p_pin text)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare v_driver uuid := auth.uid(); v_ride public.rides;
begin
  select * into v_ride from public.rides where id = p_ride for update;
  if v_ride is null then raise exception 'Course introuvable'; end if;
  if v_ride.driver_id is distinct from v_driver then
    raise exception 'Action réservée au chauffeur assigné';
  end if;
  if v_ride.status <> 'arrived' then
    raise exception 'Transition invalide depuis le statut %', v_ride.status;
  end if;
  if p_pin is null or p_pin <> v_ride.pin_code then
    raise exception 'PIN incorrect';
  end if;
  update public.rides set status = 'started', started_at = now() where id = p_ride returning * into v_ride;
  insert into public.ride_events (ride_id, type, actor) values (p_ride, 'started', v_driver);
  return v_ride;
end;
$$;

-- ----------------------------------------------------------------------------
-- Terminer la course : fixe le prix final et impacte le solde (cash) ou crée
-- un encaissement mobile (airtel) à confirmer ensuite par l'Edge Function.
-- ----------------------------------------------------------------------------
create or replace function public.complete_ride(p_ride uuid, p_price_final numeric default null)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare v_driver uuid := auth.uid(); v_ride public.rides; v_price numeric;
begin
  select * into v_ride from public.rides where id = p_ride for update;
  if v_ride is null then raise exception 'Course introuvable'; end if;
  if v_ride.driver_id is distinct from v_driver then
    raise exception 'Action réservée au chauffeur assigné';
  end if;
  if v_ride.status <> 'started' then
    raise exception 'Transition invalide depuis le statut %', v_ride.status;
  end if;

  v_price := coalesce(p_price_final, v_ride.price_est, 0);

  update public.rides
     set status = 'completed', price_final = v_price, completed_at = now()
   where id = p_ride
   returning * into v_ride;

  if v_ride.payment_method = 'cash' then
    -- le chauffeur a encaissé le cash : il doit la commission à Teko
    perform public.post_ledger(v_driver, 'commission_due',
                               -public.commission_amount(v_price), p_ride);
  else
    -- paiement mobile : encaissement à confirmer par l'Edge Function (puis mobile_credit)
    insert into public.payments (ride_id, driver_id, kind, provider, direction, amount, currency, partner_txn_id, status)
    values (p_ride, v_driver, 'ride_collection', 'airtel', 'in', v_price, 'XAF',
            'ride-'||p_ride::text, 'initiated')
    on conflict (partner_txn_id) do nothing;
  end if;

  insert into public.ride_events (ride_id, type, actor, meta)
  values (p_ride, 'completed', v_driver, jsonb_build_object('price_final', v_price));
  insert into public.notifications (user_id, type, payload)
  values (v_ride.client_id, 'ride_completed', jsonb_build_object('ride_id', p_ride, 'price', v_price));
  return v_ride;
end;
$$;

-- ----------------------------------------------------------------------------
-- Annuler une course (client, chauffeur ou admin)
-- ----------------------------------------------------------------------------
create or replace function public.cancel_ride(
  p_ride uuid, p_reason text default null, p_status public.ride_status default null
) returns public.rides
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_ride public.rides; v_new public.ride_status;
begin
  select * into v_ride from public.rides where id = p_ride for update;
  if v_ride is null then raise exception 'Course introuvable'; end if;
  if not (v_ride.status = any (array['requested','accepted','enroute','arrived']::public.ride_status[])) then
    raise exception 'Annulation impossible depuis le statut %', v_ride.status;
  end if;

  if v_uid = v_ride.client_id then
    v_new := 'cancelled_client';
  elsif v_uid = v_ride.driver_id then
    v_new := coalesce(p_status, 'cancelled_driver');
    if not (v_new = any (array['cancelled_driver','no_show','no_answer']::public.ride_status[])) then
      raise exception 'Statut d''annulation invalide pour un chauffeur';
    end if;
  elsif public.is_admin() then
    v_new := coalesce(p_status, 'cancelled_driver');
  else
    raise exception 'Non autorisé à annuler cette course';
  end if;

  update public.rides set status = v_new, cancel_reason = p_reason where id = p_ride returning * into v_ride;
  insert into public.ride_events (ride_id, type, actor, meta)
  values (p_ride, 'cancelled', v_uid, jsonb_build_object('status', v_new, 'reason', p_reason));
  return v_ride;
end;
$$;
