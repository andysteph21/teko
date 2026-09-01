-- ============================================================================
-- Teko — Invitations admin : numéro en chiffres seuls (constat E2E réel,
-- validation de la chaîne d'invitation A-08). La console envoyait
-- « +24107000005 » (E.164) alors que GoTrue expose new.phone SANS « + »
-- (« 24107000005 ») : l'égalité stricte du claim (handle_new_user) ne
-- matchait jamais — invitation jamais réclamée, l'invité restait `client`
-- devant « Accès réservé à l'équipe Teko ». Le test e2e passait car il
-- envoyait déjà le format sans « + ».
-- Correctifs :
--   1. données existantes normalisées, doublons en attente fusionnés
--      (le claim prenait `order by created_at desc limit 1`) ;
--   2. une seule invitation EN ATTENTE par numéro (index unique partiel) —
--      ré-inviter met à jour rôle et expiration au lieu d'empiler ;
--   3. invite_admin normalise (chiffres seuls) et valide l'entrée ;
--   4. claim défensif : new.phone normalisé aussi côté trigger ;
--   5. contrainte chiffres seuls — le superadmin peut aussi écrire la table
--      en direct via RLS, sans passer par la RPC.
-- ============================================================================

-- 1 · Réparation des données : chiffres seuls partout, purge des invitations
--     en attente irrécupérables, fusion des doublons en attente (on garde la
--     plus récente — celle que le claim aurait choisie).
update public.admin_invites
   set phone = regexp_replace(phone, '\D', '', 'g')
 where phone ~ '\D';

delete from public.admin_invites
 where accepted_at is null and phone !~ '^\d{8,15}$';

delete from public.admin_invites a
 using public.admin_invites b
 where a.accepted_at is null and b.accepted_at is null
   and a.phone = b.phone
   and (a.created_at, a.id) < (b.created_at, b.id);

-- 2 · Une seule invitation en attente par numéro (remplace l'index simple).
drop index if exists public.admin_invites_phone_idx;
create unique index admin_invites_pending_phone_key
  on public.admin_invites (phone) where accepted_at is null;

alter table public.admin_invites
  add constraint admin_invites_phone_digits check (phone ~ '^\d{8,15}$');

-- 3 · invite_admin : normalisation + validation ; ré-inviter un numéro déjà
--     en attente (même expiré) rafraîchit le rôle et repart pour 7 jours.
create or replace function public.invite_admin(p_phone text, p_role public.admin_role)
returns public.admin_invites
language plpgsql security definer set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_row   public.admin_invites;
begin
  if not public.is_superadmin() then raise exception 'Réservé au superadmin'; end if;
  if v_phone !~ '^\d{8,15}$' then raise exception 'Numéro de téléphone invalide'; end if;
  insert into public.admin_invites (phone, admin_role, invited_by)
  values (v_phone, p_role, auth.uid())
  on conflict (phone) where accepted_at is null
  do update set admin_role = excluded.admin_role,
                invited_by = excluded.invited_by,
                created_at = now(),
                expires_at = now() + interval '7 days'
  returning * into v_row;
  return v_row;
end;
$$;

-- 4 · Claim : comparaison en chiffres seuls des deux côtés (la table est
--     garantie chiffres seuls par la contrainte ci-dessus).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_invite public.admin_invites;
begin
  insert into public.profiles (id, phone, email, role)
  values (new.id, new.phone, new.email, 'client')
  on conflict (id) do nothing;

  if new.phone is not null then
    select * into v_invite from public.admin_invites
     where phone = regexp_replace(new.phone, '\D', '', 'g')
       and accepted_at is null and expires_at > now()
     order by created_at desc limit 1;
    -- NB : « v_invite is not null » serait faux dès qu'un champ est null
    -- (sémantique ROW IS NOT NULL) — on teste `found`.
    if found then
      perform public.set_service_mode(true);
      update public.profiles set role = 'admin', admin_role = v_invite.admin_role where id = new.id;
      perform public.set_service_mode(false);
      update public.admin_invites set accepted_at = now(), accepted_by = new.id where id = v_invite.id;
      insert into public.audit_log (actor, action, entity, entity_id, after)
      values (v_invite.invited_by, 'admin_invite_claimed', 'profile', new.id::text,
              jsonb_build_object('admin_role', v_invite.admin_role));
    end if;
  end if;
  return new;
end;
$$;
