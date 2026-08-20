-- ============================================================================
-- Teko — 0016 : Sécurité de la surface API (écarts E-15 & E-16 + audit e2e)
--
-- 1. Grants DML : jusqu'ici AUCUN privilège SELECT/INSERT/UPDATE/DELETE
--    n'était accordé aux rôles API — toutes les politiques RLS étaient
--    inatteignables (l'API ne fonctionnait que par RPC) et `anon` détenait
--    un TRUNCATE anormal. On accorde le DML à `authenticated`/`service_role`
--    (la RLS reprend alors son rôle) et on retire tout à `anon`.
-- 2. Fonctions internes : `set_service_mode`, `post_ledger`,
--    `confirm_payment`, `fail_payment`, `maybe_reactivate_driver`,
--    `enqueue_notification` étaient exécutables par tout utilisateur
--    authentifié (EXECUTE par défaut à PUBLIC) — n'importe qui pouvait
--    écrire au ledger ou lever les gardes. EXECUTE est révoqué ; les appels
--    internes (fonctions SECURITY DEFINER, jobs, service_role) continuent.
-- 3. `daily_close` : garde explicite (admin, service, ou job sans JWT).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a. Tables existantes : anon → rien ; authenticated/service_role → DML.
-- ----------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on table public.%I from anon', t.tablename);
    execute format('revoke truncate on table public.%I from authenticated, service_role', t.tablename);
    execute format('grant select, insert, update, delete on table public.%I to authenticated, service_role', t.tablename);
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on all sequences in schema public from anon;

-- 1b. Objets futurs : mêmes règles par défaut.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;

-- 1c. Filet de sécurité : la RLS doit être active sur TOUTES les tables du
-- schéma public, sinon les grants ci-dessus ouvriraient la table en grand.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and not rowsecurity loop
    execute format('alter table public.%I enable row level security', t.tablename);
    raise notice 'RLS activée (était absente) sur public.%', t.tablename;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Fonctions internes : plus d'EXECUTE pour les rôles API.
--    (Les fonctions SECURITY DEFINER appartenant à postgres les appellent
--    toujours ; service_role garde l'accès pour les Edge Functions.)
-- ----------------------------------------------------------------------------
revoke execute on function public.set_service_mode(boolean)                          from public, anon, authenticated;
revoke execute on function public.post_ledger(uuid, public.ledger_kind, numeric, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.confirm_payment(uuid)                              from public, anon, authenticated;
revoke execute on function public.fail_payment(uuid, text)                           from public, anon, authenticated;
revoke execute on function public.maybe_reactivate_driver(uuid)                      from public, anon, authenticated;
revoke execute on function public.enqueue_notification(uuid, text, jsonb)            from public, anon, authenticated;

grant execute on function public.confirm_payment(uuid)         to service_role;
grant execute on function public.fail_payment(uuid, text)      to service_role;
grant execute on function public.post_ledger(uuid, public.ledger_kind, numeric, uuid, uuid, timestamptz) to service_role;
grant execute on function public.maybe_reactivate_driver(uuid) to service_role;
grant execute on function public.enqueue_notification(uuid, text, jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- 3. daily_close : réservé aux admins, au service et aux jobs.
--    Motif de garde réutilisable : un JWT utilisateur présent ET non-admin
--    est refusé ; les jobs pg_cron (pas de JWT) et service_role passent.
-- ----------------------------------------------------------------------------
create or replace function public.assert_admin_or_service()
returns void
language plpgsql stable security definer set search_path = public
as $$
begin
  if coalesce(current_setting('teko.service', true), '') = 'on' then return; end if;
  if auth.uid() is null then return; end if;  -- job/cron ou service_role (pas de JWT utilisateur)
  if public.is_admin() then return; end if;
  raise exception 'Réservé aux administrateurs ou au service';
end;
$$;
revoke execute on function public.assert_admin_or_service() from public, anon, authenticated;

-- On enveloppe daily_close sans dupliquer sa logique : renommage + wrapper gardé.
alter function public.daily_close(date) rename to _daily_close_unguarded;
revoke execute on function public._daily_close_unguarded(date) from public, anon, authenticated;

create function public.daily_close(p_day date default public.business_day())
returns integer
language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_admin_or_service();
  return public._daily_close_unguarded(p_day);
end;
$$;
comment on function public.daily_close(date)
  is 'Clôture journalière 04:00 — gardée : admin, service ou job uniquement (E-16).';
