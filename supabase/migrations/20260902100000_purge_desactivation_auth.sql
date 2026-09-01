-- ============================================================================
-- Teko — Purge de compte : désactivation de l'identité auth (trou constaté en
-- validation le 1er sept. 2026 : un compte purgé/anonymisé restait pleinement
-- utilisable, la session GoTrue survivant à la purge).
--
-- La migration 20260820100200 annonçait « la désactivation du compte auth
-- relève d'une Edge Function » — jamais écrite. Elle existe désormais :
-- `account-purge` (supabase/functions/account-purge) soft-delete les
-- utilisateurs GoTrue (deleted_at posé, numéro/e-mail obfusqués → le numéro
-- redevient libre pour une nouvelle inscription, sessions et refresh tokens
-- révoqués). Déclenchement :
--   1) à la fin de purge_deleted_accounts (pg_net, meilleur-effort) ;
--   2) job pg_cron quotidien de rattrapage (02:45 UTC) — la fonction est
--      idempotente : elle ne traite que pending_auth_purges().
-- Comme pour le push : URL + secret dans app_config ; absents → no-op
-- silencieux, l'anonymisation métier n'est JAMAIS bloquée.
-- ============================================================================

insert into public.app_config (key, value, description) values
  ('purge_webhook_url',    'null'::jsonb, 'URL de l''Edge Function account-purge (null = désactivation auth non déclenchée)'),
  ('purge_webhook_secret', 'null'::jsonb, 'Secret partagé du webhook de purge (en-tête x-teko-purge-secret)')
on conflict (key) do nothing;

-- Comptes purgés côté métier dont l'identité auth est encore vivante.
create or replace function public.pending_auth_purges()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select p.id
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.deleted_at is not null
     and u.deleted_at is null;
$$;
revoke all on function public.pending_auth_purges() from public, anon, authenticated;
grant execute on function public.pending_auth_purges() to service_role;

create or replace function public.notify_purge_webhook()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value #>> '{}' into v_url    from public.app_config where key = 'purge_webhook_url';
  select value #>> '{}' into v_secret from public.app_config where key = 'purge_webhook_secret';
  if v_url is null or v_url = '' then
    return;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-teko-purge-secret', coalesce(v_secret, '')
    ),
    body    := jsonb_build_object('source', 'purge_deleted_accounts', 'at', now())
  );
exception when others then
  -- Meilleur-effort : le job de rattrapage repassera.
  null;
end;
$$;
revoke all on function public.notify_purge_webhook() from public, anon, authenticated;
grant execute on function public.notify_purge_webhook() to service_role;

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

-- Rattrapage quotidien, 15 min après la purge (02:30 UTC).
select cron.schedule('teko-purge-auth', '45 2 * * *', $$select public.notify_purge_webhook();$$);
