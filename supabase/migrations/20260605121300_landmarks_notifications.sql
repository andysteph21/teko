-- ============================================================================
-- Teko — 0014 : Repères (adressage/guidage) + notifications + règlement chauffeur
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Repères validés les plus pertinents autour d'un point (saillance puis distance)
-- ----------------------------------------------------------------------------
create or replace function public.nearest_landmarks(
  p_point extensions.geometry, p_max_m numeric default 500, p_limit integer default 5
) returns setof public.landmarks
language sql stable security definer set search_path = public, extensions
as $$
  select *
    from public.landmarks
   where status = 'validated'
     and ST_DWithin(geom::geography, p_point::geography, p_max_m)
   order by salience desc, geom <-> p_point
   limit p_limit;
$$;

-- Suggestion de point de rendez-vous (meilleur repère proche)
create or replace function public.suggest_meeting_landmark(
  p_point extensions.geometry, p_max_m numeric default 300
) returns uuid
language sql stable security definer set search_path = public, extensions
as $$
  select id from public.nearest_landmarks(p_point, p_max_m, 1);
$$;

-- Géocodage inverse "par repère" : « près de <repère> »
create or replace function public.reverse_geocode_landmark(
  p_point extensions.geometry, p_max_m numeric default 500
) returns text
language plpgsql stable security definer set search_path = public, extensions
as $$
declare v text;
begin
  select name into v from public.nearest_landmarks(p_point, p_max_m, 1);
  if v is null then return null; end if;
  return 'près de ' || v;
end;
$$;

-- ----------------------------------------------------------------------------
-- Proposition d'un repère (chauffeur ou client)
-- ----------------------------------------------------------------------------
create or replace function public.propose_landmark(
  p_name text, p_category public.landmark_category, p_point extensions.geometry,
  p_aliases text[] default '{}', p_photo text default null
) returns public.landmark_proposals
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_role public.user_role; v_row public.landmark_proposals;
begin
  if v_uid is null then raise exception 'Authentification requise'; end if;
  select role into v_role from public.profiles where id = v_uid;
  insert into public.landmark_proposals (name, category, geom, aliases, photo_url, proposed_by, role, status)
  values (p_name, p_category, p_point, p_aliases, p_photo, v_uid, v_role, 'proposed')
  returning * into v_row;
  return v_row;
end;
$$;

-- Validation/rejet d'une proposition de repère (admin)
create or replace function public.validate_landmark_proposal(
  p_proposal uuid, p_accept boolean
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_prop public.landmark_proposals; v_src public.geo_source; v_id uuid;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  select * into v_prop from public.landmark_proposals where id = p_proposal for update;
  if v_prop is null then raise exception 'Proposition introuvable'; end if;

  if not p_accept then
    update public.landmark_proposals set status = 'rejected', reviewed_by = auth.uid() where id = p_proposal;
    return null;
  end if;

  v_src := case v_prop.role when 'driver' then 'driver' when 'client' then 'client' else 'admin' end;
  insert into public.landmarks (name, aliases, category, geom, photo_url, source, status, created_by, validated_by)
  values (v_prop.name, v_prop.aliases, v_prop.category, v_prop.geom, v_prop.photo_url, v_src, 'validated', v_prop.proposed_by, auth.uid())
  returning id into v_id;

  update public.landmark_proposals set status = 'merged', reviewed_by = auth.uid(), landmark_id = v_id where id = p_proposal;
  return v_id;
end;
$$;

-- Incrémente l'usage d'un repère (renforce la saillance) — appelé lors d'une sélection
create or replace function public.bump_landmark_usage(p_landmark uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.landmarks
     set usage_count = usage_count + 1,
         salience = salience + 0.1
   where id = p_landmark and status = 'validated';
$$;

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
create or replace function public.enqueue_notification(
  p_user uuid, p_type text, p_payload jsonb default '{}'
) returns public.notifications
language plpgsql security definer set search_path = public
as $$
declare v_row public.notifications;
begin
  insert into public.notifications (user_id, type, payload)
  values (p_user, p_type, p_payload)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.notifications set read_at = now()
   where id = p_id and user_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- Règlement du chauffeur (crée un encaissement à exécuter par l'Edge Function)
-- ----------------------------------------------------------------------------
create or replace function public.create_settlement_payment(p_amount numeric)
returns public.payments
language plpgsql security definer set search_path = public
as $$
declare v_driver uuid := auth.uid(); v_row public.payments;
begin
  if not exists (select 1 from public.drivers where id = v_driver) then
    raise exception 'Chauffeur introuvable';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Montant invalide'; end if;

  insert into public.payments (driver_id, kind, provider, direction, amount, currency, partner_txn_id, status)
  values (v_driver, 'driver_settlement', 'airtel', 'in', p_amount, 'XAF',
          'settle-'||v_driver::text||'-'||(extract(epoch from clock_timestamp())*1000)::bigint::text, 'initiated')
  returning * into v_row;
  return v_row;
end;
$$;
