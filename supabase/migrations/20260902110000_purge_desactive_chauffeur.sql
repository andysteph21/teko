-- ============================================================================
-- Teko — Purge de compte : le chauffeur purgé sort du dispatch.
--
-- Constaté le 2 sept. 2026 en validant la désactivation auth : un chauffeur
-- purgé (profil « Compte supprimé ») dont l'app tournait encore continuait
-- d'envoyer des heartbeats — purge_deleted_accounts efface driver_presence,
-- mais driver_heartbeat la recrée tant que drivers.is_active est vrai — et
-- captait les offres (e2e compte-sos : « Aucune offre active » pour Boris).
-- La purge suspend désormais la fiche chauffeur (is_active = false, motif
-- `account_purged`, journalisé par le trigger d'audit, acteur système) :
-- heartbeat refusé, chauffeur inéligible à offer_next_driver.
-- ============================================================================

create or replace function public.purge_deleted_accounts()
returns integer
language plpgsql security definer set search_path = public
as $$
declare r record; v_count integer := 0;
  v_grace integer := coalesce((select value::text::int from public.app_config where key = 'deletion_grace_days'), 30);
begin
  perform public.assert_admin_or_service();
  perform public.set_service_mode(true);
  for r in select id from public.profiles
            where deletion_requested_at is not null
              and deletion_requested_at < now() - make_interval(days => v_grace)
              and deleted_at is null
  loop
    update public.profiles
       set full_name = 'Compte supprimé', email = null, phone = null,
           photo_url = null, deleted_at = now()
     where id = r.id;
    -- Chauffeur : hors dispatch définitivement (heartbeat refusé).
    update public.drivers
       set is_active = false, deactivated_reason = 'account_purged'
     where id = r.id and is_active;
    delete from public.saved_places  where user_id = r.id;
    delete from public.devices       where user_id = r.id;
    delete from public.notifications where user_id = r.id;
    delete from public.data_usage    where user_id = r.id;
    delete from public.driver_presence where driver_id = r.id;
    v_count := v_count + 1;
  end loop;
  perform public.set_service_mode(false);
  -- Désactivation auth des comptes purgés (Edge Function account-purge).
  if v_count > 0 then
    perform public.notify_purge_webhook();
  end if;
  return v_count;
end;
$$;

-- Rattrapage des chauffeurs déjà purgés avant cette migration.
do $$
begin
  perform public.set_service_mode(true);
  update public.drivers d
     set is_active = false, deactivated_reason = 'account_purged'
    from public.profiles p
   where p.id = d.id and p.deleted_at is not null and d.is_active;
  delete from public.driver_presence
   where driver_id in (select id from public.profiles where deleted_at is not null);
  perform public.set_service_mode(false);
end;
$$;
