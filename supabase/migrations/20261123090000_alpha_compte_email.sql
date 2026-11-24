-- Compte par e-mail (lot R1, décisions du porteur du 23 novembre 2026).
--  A1 : l'e-mail est mis en avant ; le téléphone vérifié reste accepté pour
--       l'option SMS future et pour les comptes existants.
--  A3 : le numéro devient une donnée de contact déclarée, sans unicité.
--  A4 : l'invitation alpha se prouve par l'e-mail vérifié (ou, pour les
--       comptes existants, par le numéro vérifié). Jamais par un champ de
--       profil modifiable.
-- Corrige aussi une régression : la migration 20261111090000 avait réécrit
-- offer_next_driver sans la garde d'invitation du dispatch.

alter table public.alpha_invites alter column phone drop not null;
alter table public.alpha_invites add column email text
  check (email is null or (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));
alter table public.alpha_invites add constraint alpha_invites_identity
  check (phone is not null or email is not null);
create unique index alpha_invites_email_role_key on public.alpha_invites (email, role)
  where email is not null;

-- Source unique de la règle : une identité VÉRIFIÉE par Auth correspond à une
-- invitation active du rôle demandé.
create function private.user_alpha_invited(p_user uuid, p_role text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from auth.users u join public.alpha_invites i on
      (i.email is not null and u.email_confirmed_at is not null and i.email = lower(u.email))
      or (i.phone is not null and u.phone_confirmed_at is not null
        and i.phone = regexp_replace(u.phone, '[^0-9]', '', 'g'))
    where u.id = p_user and u.deleted_at is null and i.is_active and i.role = p_role);
$$;
revoke all on function private.user_alpha_invited(uuid, text) from public, anon, authenticated;

create or replace function public.is_alpha_invited(p_role text)
returns boolean language sql stable security definer set search_path = public
as $$ select private.user_alpha_invited(auth.uid(), p_role); $$;

create or replace function private.assert_alpha_invited(p_role text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not private.user_alpha_invited(auth.uid(), p_role) then
    raise exception 'Invitation alpha requise pour ce compte vérifié' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.create_ride_quote(p_client uuid, p_category public.vehicle_category,
  p_origin extensions.geometry, p_dest extensions.geometry, p_distance_m integer, p_duration_s integer, p_shape text)
returns public.ride_quotes language plpgsql security definer set search_path = public
as $$
begin
  if not private.user_alpha_invited(p_client, 'client') then
    raise exception 'Invitation alpha requise pour ce compte vérifié' using errcode = '42501';
  end if;
  return public._create_ride_quote(p_client, p_category, p_origin, p_dest, p_distance_m, p_duration_s, p_shape);
end;
$$;

create or replace function public.validate_kyc(p_driver uuid, p_accept boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops'))) then
    raise exception 'Validation réservée aux opérations' using errcode = '42501';
  end if;
  perform 1 from public.drivers where id = p_driver for update;
  if p_accept then
    if not private.kyc_ready(p_driver) then
      raise exception 'Sept pièces validées et vérification physique requises' using errcode = '22023';
    end if;
    if not private.user_alpha_invited(p_driver, 'driver') then
      raise exception 'Invitation chauffeur requise' using errcode = '42501';
    end if;
  end if;
  perform public._validate_kyc(p_driver, p_accept, p_note);
end;
$$;

-- Dispatch : un chauffeur dont l'invitation a été retirée ne reçoit plus d'offre.
do $$
declare definition text; updated text;
begin
  definition := pg_get_functiondef('public.offer_next_driver(uuid)'::regprocedure);
  updated := replace(definition, 'where d.is_active and',
    'where private.user_alpha_invited(d.id, ''driver'') and d.is_active and');
  if updated = definition then raise exception 'Garde invitation du dispatch non installée'; end if;
  execute updated;
end;
$$;

create function public.invite_alpha_email(p_email text, p_role text, p_active boolean default true)
returns public.alpha_invites language plpgsql security definer set search_path = public
as $$
declare result public.alpha_invites; address text := lower(trim(coalesce(p_email, '')));
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops'))) then
    raise exception 'Invitations réservées aux opérations' using errcode = '42501';
  end if;
  if address !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or p_role not in ('client', 'driver') then
    raise exception 'Adresse e-mail ou rôle invalide' using errcode = '22023';
  end if;
  insert into public.alpha_invites(email, role, is_active, invited_by)
    values(address, p_role, p_active, auth.uid())
    on conflict(email, role) where email is not null do update set is_active = excluded.is_active,
      invited_by = excluded.invited_by, updated_at = now() returning * into result;
  insert into public.audit_log(actor, action, entity, entity_id, after)
    values(auth.uid(), 'alpha_invitation_changed', 'alpha_invite', result.id::text,
      jsonb_build_object('role', p_role, 'is_active', p_active, 'identity', 'email'));
  return result;
end;
$$;
revoke all on function public.invite_alpha_email(text, text, boolean) from public, anon;
grant execute on function public.invite_alpha_email(text, text, boolean) to authenticated, service_role;

-- Numéro déclaré : contact, pas identité. Plusieurs comptes peuvent déclarer
-- le même numéro (sans vérification, l'unicité permettrait de bloquer le
-- numéro d'autrui). Chiffres seuls, normalisés à l'écriture, changement tracé.
alter table public.profiles drop constraint if exists profiles_phone_key;
create index profiles_phone_idx on public.profiles (phone) where phone is not null;

create function public.update_contact_phone(p_phone text)
returns text language plpgsql security definer set search_path = public
as $$
declare digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'); previous text;
begin
  if auth.uid() is null then
    raise exception 'Session requise' using errcode = '42501';
  end if;
  if digits !~ '^[0-9]{8,15}$' then
    raise exception 'Numéro de téléphone invalide' using errcode = '22023';
  end if;
  select phone into previous from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Profil introuvable' using errcode = '42501'; end if;
  update public.profiles set phone = digits where id = auth.uid();
  insert into public.audit_log(actor, action, entity, entity_id, before, after)
    values(auth.uid(), 'contact_phone_changed', 'profile', auth.uid()::text,
      jsonb_build_object('had_phone', previous is not null), jsonb_build_object('has_phone', true));
  return digits;
end;
$$;
revoke all on function public.update_contact_phone(text) from public, anon;
grant execute on function public.update_contact_phone(text) to authenticated;

-- Garde de création de compte pour l'Auth terrain (hook GoTrue « avant
-- création d'utilisateur ») : seule une adresse ou un numéro invité peut
-- ouvrir un compte. À déclarer dans la configuration Auth du banc.
create function public.alpha_before_user_created(event jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare address text := lower(coalesce(event->'user'->>'email', ''));
  digits text := regexp_replace(coalesce(event->'user'->>'phone', ''), '[^0-9]', '', 'g');
begin
  if exists(select 1 from public.alpha_invites i where i.is_active
    and ((address <> '' and i.email = address) or (digits <> '' and i.phone = digits))) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Invitation alpha requise'));
end;
$$;
revoke all on function public.alpha_before_user_created(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.alpha_before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.alpha_invites to supabase_auth_admin;
notify pgrst, 'reload schema';
