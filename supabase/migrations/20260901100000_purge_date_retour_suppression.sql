-- request_account_deletion renvoyait la date de la DEMANDE (now()) alors que
-- le contrat (api-client) et l'écran « Compte désactivé » (C-28) attendent la
-- date de PURGE — l'app affichait le jour même au lieu de la fin de la
-- fenêtre de rétractation. La notification calculait déjà le bon purge_after :
-- les deux passent désormais par la même variable, pilotée par
-- app_config.deletion_grace_days (30 j par défaut).

create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_when  timestamptz := now();
  v_purge timestamptz;
begin
  if v_uid is null then raise exception 'Authentification requise'; end if;
  if exists (select 1 from public.rides
              where (client_id = v_uid or driver_id = v_uid)
                and status in ('requested','accepted','enroute','arrived','started')) then
    raise exception 'Impossible : une course est en cours';
  end if;
  if public.is_driver() and public.driver_balance(v_uid) < 0 then
    raise exception 'Impossible : solde chauffeur à régler avant suppression';
  end if;
  perform public.set_service_mode(true);
  update public.profiles set deletion_requested_at = v_when where id = v_uid;
  perform public.set_service_mode(false);
  v_purge := v_when + make_interval(days => coalesce(
    (select value::text::int from public.app_config where key = 'deletion_grace_days'), 30));
  perform public.enqueue_notification(v_uid, 'deletion_requested',
    jsonb_build_object('purge_after', v_purge));
  return v_purge;
end;
$$;
