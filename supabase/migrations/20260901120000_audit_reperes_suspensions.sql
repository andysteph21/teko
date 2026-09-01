-- Journal d'audit : tenir en base deux promesses affichées par la console.
-- 1) A-04 · validate_landmark_proposal — même portée que les routes (carto ou
--    superadmin, cf. matrice A-09) et écriture au journal dans les deux issues.
--    Constat de la validation E2E du 1er septembre : garde « is_admin() » seule
--    (un admin finance pouvait publier un repère) et aucune trace au journal.
-- 2) A-06/A-10 · toute bascule de drivers.is_active journalisée, acteur humain
--    (suspension manuelle) comme système (daily_close, réactivation auto) —
--    la console promet « chaque action est horodatée au journal d'audit ».

create or replace function public.validate_landmark_proposal(p_proposal uuid, p_accept boolean)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_prop public.landmark_proposals; v_id uuid;
  v_src public.geo_source;
begin
  if not (public.is_admin() and (public.has_admin_role('carto') or public.is_superadmin())) then
    raise exception 'Réservé aux admins carto';
  end if;
  select * into v_prop from public.landmark_proposals where id = p_proposal for update;
  if v_prop is null then raise exception 'Proposition introuvable'; end if;
  if v_prop.status <> 'proposed' then raise exception 'Proposition déjà traitée (%)', v_prop.status; end if;

  if not p_accept then
    update public.landmark_proposals set status = 'rejected', reviewed_by = auth.uid() where id = p_proposal;
    insert into public.audit_log (actor, action, entity, entity_id, after)
    values (auth.uid(), 'landmark_rejected', 'landmark_proposal', p_proposal::text,
            jsonb_build_object('name', v_prop.name));
    if v_prop.proposed_by is not null then
      perform public.enqueue_notification(v_prop.proposed_by, 'landmark_rejected',
        jsonb_build_object('proposal_id', p_proposal, 'name', v_prop.name));
    end if;
    return null;
  end if;

  v_src := coalesce(v_prop.role::text, 'client')::public.geo_source;
  insert into public.landmarks (name, aliases, category, geom, photo_url, source, status, created_by, validated_by)
  values (v_prop.name, v_prop.aliases, v_prop.category, v_prop.geom, v_prop.photo_url,
          v_src, 'validated', v_prop.proposed_by, auth.uid())
  returning id into v_id;
  update public.landmark_proposals
     set status = 'merged', reviewed_by = auth.uid(), landmark_id = v_id
   where id = p_proposal;
  insert into public.audit_log (actor, action, entity, entity_id, after)
  values (auth.uid(), 'landmark_validated', 'landmark', v_id::text,
          jsonb_build_object('proposal_id', p_proposal, 'name', v_prop.name));
  if v_prop.proposed_by is not null then
    perform public.enqueue_notification(v_prop.proposed_by, 'landmark_accepted',
      jsonb_build_object('proposal_id', p_proposal, 'landmark_id', v_id, 'name', v_prop.name));
  end if;
  return v_id;
end;
$$;

-- Bascules d'activité chauffeur : une ligne d'audit par transition, quel que
-- soit le chemin d'écriture (update console, daily_close, maybe_reactivate).
-- actor est nul pour les jobs (cron/service) — la console l'affiche « système ».
create or replace function public.audit_driver_active_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.is_active is distinct from new.is_active then
    insert into public.audit_log (actor, action, entity, entity_id, before, after)
    values (auth.uid(),
            case when new.is_active then 'driver_reactivated' else 'driver_suspended' end,
            'driver', new.id::text,
            jsonb_build_object('is_active', old.is_active, 'reason', old.deactivated_reason),
            jsonb_build_object('is_active', new.is_active, 'reason', new.deactivated_reason));
  end if;
  return new;
end;
$$;

drop trigger if exists drivers_audit_active on public.drivers;
create trigger drivers_audit_active
  after update on public.drivers
  for each row execute function public.audit_driver_active_change();
