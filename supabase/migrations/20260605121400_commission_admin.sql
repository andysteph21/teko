-- ============================================================================
-- Teko — 0014 : Commission paramétrable par le SUPERADMIN uniquement
-- La commission (et les autres clés financières sensibles) ne peut être
-- modifiée que par un admin dont admin_role = 'superadmin'.
-- Les autres admins (ops/carto/finance) gardent l'accès aux clés non sensibles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper : le profil courant est-il superadmin ?
-- (has_admin_role('superadmin') ne renvoie vrai QUE pour admin_role='superadmin')
-- ----------------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and admin_role = 'superadmin'
  );
$$;

comment on function public.is_superadmin()
  is 'Vrai si l''utilisateur courant est admin avec le sous-rôle superadmin (plus hauts droits).';

-- ----------------------------------------------------------------------------
-- Garde : les clés de configuration financières ne sont modifiables que par
-- le superadmin. Bypass en mode service (teko.service=on) et en contexte
-- migration/seed (auth.uid() is null = pas de JWT, exécution service role).
-- ----------------------------------------------------------------------------
create or replace function public.guard_sensitive_config()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  sensitive_keys constant text[] := array[
    'commission', 'cancellation_fee', 'payout_threshold', 'settlement_cutoff_hour'
  ];
begin
  -- Contexte service / migration : on laisse passer.
  if coalesce(current_setting('teko.service', true), '') = 'on'
     or auth.uid() is null then
    return new;
  end if;

  if new.key = any (sensitive_keys) then
    if not public.is_superadmin() then
      raise exception
        'Clé de configuration sensible (%) modifiable uniquement par le superadmin', new.key
        using errcode = '42501';  -- insufficient_privilege
    end if;
  end if;
  return new;
end;
$$;

create trigger app_config_guard_sensitive
  before insert or update on public.app_config
  for each row execute function public.guard_sensitive_config();

-- ----------------------------------------------------------------------------
-- RPC : lecture de la commission courante (pour l'écran admin)
-- ----------------------------------------------------------------------------
create or replace function public.get_commission()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select value from public.app_config where key = 'commission';
$$;

-- ----------------------------------------------------------------------------
-- RPC : modification de la commission par le superadmin.
--   p_type  : 'percent' (taux %) ou 'fixed' (montant XAF par course)
--   p_value : >= 0 ; si 'percent', <= 100
-- Idempotente, historisée (trigger app_config_history), traçable (updated_by).
-- ----------------------------------------------------------------------------
create or replace function public.set_commission(p_type text, p_value numeric)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare new_val jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'Seul le superadmin peut modifier la commission'
      using errcode = '42501';
  end if;
  if p_type not in ('percent', 'fixed') then
    raise exception 'Type de commission invalide: % (attendu percent|fixed)', p_type
      using errcode = '22023';
  end if;
  if p_value is null or p_value < 0 then
    raise exception 'La valeur de commission doit être >= 0' using errcode = '22023';
  end if;
  if p_type = 'percent' and p_value > 100 then
    raise exception 'Un taux en pourcentage ne peut excéder 100' using errcode = '22023';
  end if;

  new_val := jsonb_build_object('type', p_type, 'value', p_value);

  insert into public.app_config (key, value, updated_by)
  values ('commission', new_val, auth.uid())
  on conflict (key) do update
    set value = excluded.value, updated_by = auth.uid();

  return new_val;
end;
$$;

comment on function public.set_commission(text, numeric)
  is 'Définit la commission Teko (percent|fixed). Réservé au superadmin. Historisé.';

-- Exposition aux clients authentifiés (les gardes internes font respecter les droits).
grant execute on function public.get_commission()           to authenticated;
grant execute on function public.set_commission(text, numeric) to authenticated;
grant execute on function public.is_superadmin()            to authenticated;
