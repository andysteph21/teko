-- app_config est lisible par les apps ; les secrets ne le sont jamais.
-- RESTRICTIVE s'applique même aux politiques permissives des admins.
create policy config_hide_webhook_secrets on public.app_config
  as restrictive for select to authenticated
  using (key not in ('push_webhook_secret', 'purge_webhook_secret'));

notify pgrst, 'reload schema';
