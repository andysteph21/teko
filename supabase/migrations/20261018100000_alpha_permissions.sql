-- Alpha : imposer les frontières métier à la base, pas seulement dans l'UI.
-- Les fonctions SECURITY DEFINER gardent leurs droits internes.

revoke insert, update, delete on public.rides, public.ride_events
  from authenticated;

-- PUBLIC donnait implicitement EXECUTE à anon sur les RPC gardées par
-- auth.uid() IS NULL. Les seules lectures publiques sont désormais explicites.
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public;

-- Surface applicative explicite, indépendante des droits implicites PUBLIC.
do $$
declare f record;
begin
  for f in select oid::regprocedure as signature from pg_proc
    where pronamespace = 'public'::regnamespace and proname = any(array[
      'business_day','current_app_role','is_admin','is_driver','has_admin_role',
      'is_superadmin','is_ride_participant','commission_amount',
      'estimate_price','request_ride','accept_ride','mark_arrived','start_ride',
      'complete_ride','cancel_ride','estimate_cancellation_fee','ride_driver_card',
      'driver_balance','driver_heartbeat','offer_details','respond_offer',
      'get_commission','set_commission','daily_close','validate_kyc',
      'validate_landmark_proposal','validate_road_proposal','invite_admin',
      'nearest_landmarks','suggest_meeting_landmark','reverse_geocode_landmark',
      'search_landmarks','propose_landmark','mark_notification_read',
      'create_settlement_payment','create_trip_share','get_shared_trip',
      'report_incident','request_account_deletion','cancel_account_deletion',
      'touch_last_seen','needs_reverification'
    ])
  loop
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end;
$$;
grant execute on all functions in schema public to service_role;
grant execute on function public.get_shared_trip(text) to anon;
revoke execute on function public._driver_transition(
  uuid, public.ride_status[], public.ride_status, text
) from authenticated;

-- Un chauffeur constitue son dossier pending/inactif ; il ne valide jamais
-- son propre KYC par une insertion (la garde UPDATE ne couvre pas INSERT).
drop policy drivers_insert_self_or_admin on public.drivers;
create policy drivers_insert_self_or_admin on public.drivers for insert
  to authenticated with check (
    (id = auth.uid() and kyc_status = 'pending' and not is_active
      and deactivated_reason is null and rating_avg = 0 and current_balance_cache = 0)
    or public.is_superadmin()
    or (public.is_admin() and public.has_admin_role('ops'))
  );

-- Une identité de chauffeur valide ne suffit pas : il doit être assigné
-- à cette course active pour y écrire une position.
drop policy ride_locations_insert_driver on public.ride_locations;
create policy ride_locations_insert_driver on public.ride_locations for insert
  to authenticated with check (
    driver_id = auth.uid() and exists (
      select 1 from public.rides r
       where r.id = ride_id and r.driver_id = auth.uid()
         and r.status in ('accepted','enroute','arrived','started')
    )
  );

-- Conserver le calcul privé pour les écritures internes sous SECURITY DEFINER.
alter function public.driver_balance(uuid) rename to _driver_balance;
revoke execute on function public._driver_balance(uuid) from public, anon, authenticated;
create function public.driver_balance(p_driver uuid)
returns numeric language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() is distinct from p_driver
     and not (public.is_superadmin()
       or (public.is_admin() and public.has_admin_role('finance')))
     and coalesce(current_setting('teko.service', true), '') <> 'on' then
    raise exception 'Solde réservé au chauffeur et à Finance' using errcode = '42501';
  end if;
  return public._driver_balance(p_driver);
end;
$$;
revoke execute on function public.driver_balance(uuid) from public, anon;
grant execute on function public.driver_balance(uuid) to authenticated, service_role;

-- Les traitements internes parcourant tous les chauffeurs doivent utiliser
-- le calcul privé, indépendamment de l'identité de l'admin qui lance le job.
-- Ils disposent déjà d'une garde d'accès et s'exécutent comme propriétaire.
do $$
declare f record; definition text;
begin
  for f in select oid from pg_proc where pronamespace = 'public'::regnamespace
    and proname = any(array['post_ledger','maybe_reactivate_driver',
      '_daily_close_unguarded','send_settlement_reminders'])
  loop
    definition := replace(pg_get_functiondef(f.oid),
      'public.driver_balance(', 'public._driver_balance(');
    execute definition;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
