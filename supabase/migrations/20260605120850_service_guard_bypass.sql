-- ============================================================================
-- Teko — 0009 : Bypass des gardes pour les fonctions de service
-- Les fonctions de service (SECURITY DEFINER) posent un GUC de session
-- `teko.service = on` pour pouvoir modifier des champs protégés (solde, statut…)
-- de façon contrôlée. Les utilisateurs normaux restent soumis aux gardes.
-- ============================================================================

create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(current_setting('teko.service', true), '') = 'on' then
    return new;
  end if;
  if (new.role is distinct from old.role)
     or (new.admin_role is distinct from old.admin_role) then
    if not public.is_admin() then
      raise exception 'Modification du rôle non autorisée';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_driver_sensitive_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(current_setting('teko.service', true), '') = 'on' then
    return new;
  end if;
  if (new.kyc_status is distinct from old.kyc_status)
     or (new.is_active is distinct from old.is_active)
     or (new.deactivated_reason is distinct from old.deactivated_reason)
     or (new.rating_avg is distinct from old.rating_avg)
     or (new.current_balance_cache is distinct from old.current_balance_cache) then
    if not public.is_admin() then
      raise exception 'Champs sensibles chauffeur modifiables uniquement par un admin ou le service';
    end if;
  end if;
  return new;
end;
$$;

-- Aide : (dé)active le mode service dans la transaction courante.
create or replace function public.set_service_mode(p_on boolean)
returns void
language sql
as $$ select set_config('teko.service', case when p_on then 'on' else 'off' end, true); $$;
