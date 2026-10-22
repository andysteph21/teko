-- Masquer app_config ne suffisait pas : l'historique contenait aussi les
-- anciennes et nouvelles valeurs. Ne jamais journaliser de secret en clair.
create policy config_history_hide_secrets on public.app_config_history
  as restrictive for select to authenticated
  using(key not in ('push_webhook_secret','purge_webhook_secret'));
update public.app_config_history set old_value=null,new_value=null
  where key in ('push_webhook_secret','purge_webhook_secret');
create or replace function public.log_app_config_change()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.app_config_history(key,old_value,new_value,changed_by)
    values(new.key,
      case when new.key in ('push_webhook_secret','purge_webhook_secret') then null
        when tg_op='UPDATE' then old.value else null end,
      case when new.key in ('push_webhook_secret','purge_webhook_secret') then null else new.value end,
      auth.uid());
  return new;
end;
$$;

-- Les paramètres d'exploitation et de sécurité appartiennent au superadmin.
-- Secrets et destinations de webhook : configuration de déploiement uniquement.
create or replace function public.guard_sensitive_config()
returns trigger language plpgsql security definer set search_path=public
as $$
declare target text;
begin
  target:=case when tg_op='DELETE' then old.key else new.key end;
  if auth.uid() is null or coalesce(current_setting('teko.service',true),'')='on' then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  if target in ('push_webhook_secret','purge_webhook_secret','push_webhook_url','purge_webhook_url')
    or (tg_op='UPDATE' and new.key<>old.key) then
    raise exception 'Configuration réservée au déploiement' using errcode='42501';
  end if;
  if not public.is_superadmin() then
    raise exception 'Configuration réservée au superadmin' using errcode='42501';
  end if;
  if tg_op='DELETE' then
    raise exception 'Suppression de configuration interdite' using errcode='42501';
  end if;
  return new;
end;
$$;
drop trigger app_config_guard_sensitive on public.app_config;
create trigger app_config_guard_sensitive before insert or update or delete on public.app_config
  for each row execute function public.guard_sensitive_config();
