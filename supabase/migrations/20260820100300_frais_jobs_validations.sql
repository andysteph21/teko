-- ============================================================================
-- Teko — 0019 : Frais d'annulation, validations admin, jobs planifiés
-- Écarts E-03 (frais), E-13 (validation routes), E-14 (validation KYC),
-- E-17 (notification repère), E-11 (bucket photos), E-02/E-07 (pg_cron).
-- ============================================================================

-- Frais d'annulation : fixe ET/OU pourcentage (décision produit), no-show à part.
update public.app_config
   set value = value || '{"fixed":300,"percent":20}'::jsonb
 where key = 'cancellation_fee' and not (value ? 'fixed');

-- ----------------------------------------------------------------------------
-- E-03 · cancel_ride poste enfin le frais au ledger (compensation chauffeur).
-- Client annule après acceptation → max(fixe, pourcentage × prix estimé).
-- no_show / no_answer → montants dédiés de la config.
-- Airtel : un paiement cancellation_fee est initié côté client ; cash : le
-- frais est tracé au ledger et dans ride_events (recouvrement produit v1).
-- ----------------------------------------------------------------------------
create or replace function public.cancel_ride(
  p_ride uuid, p_reason text default null, p_status public.ride_status default null
) returns public.rides
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); v_ride public.rides; v_new public.ride_status;
  v_cfg jsonb; v_fee numeric := 0; v_prev public.ride_status;
begin
  select * into v_ride from public.rides where id = p_ride for update;
  if v_ride is null then raise exception 'Course introuvable'; end if;
  v_prev := v_ride.status;
  if not (v_prev = any (array['requested','accepted','enroute','arrived']::public.ride_status[])) then
    raise exception 'Annulation impossible depuis le statut %', v_prev;
  end if;

  if v_uid = v_ride.client_id then
    v_new := 'cancelled_client';
  elsif v_uid = v_ride.driver_id then
    v_new := coalesce(p_status, 'cancelled_driver');
    if not (v_new = any (array['cancelled_driver','no_show','no_answer']::public.ride_status[])) then
      raise exception 'Statut d''annulation invalide pour un chauffeur';
    end if;
  elsif public.is_admin() then
    v_new := coalesce(p_status, 'cancelled_driver');
  else
    raise exception 'Non autorisé à annuler cette course';
  end if;

  select value into v_cfg from public.app_config where key = 'cancellation_fee';
  if v_ride.driver_id is not null then
    if v_new = 'cancelled_client'
       and v_prev = any (array['accepted','enroute','arrived']::public.ride_status[]) then
      v_fee := greatest(coalesce((v_cfg->>'fixed')::numeric, 0),
                        coalesce((v_cfg->>'percent')::numeric, 0) * coalesce(v_ride.price_est, 0) / 100.0);
    elsif v_new in ('no_show','no_answer') then
      v_fee := coalesce((v_cfg->>(v_new::text))::numeric, 0);
    end if;
  end if;

  update public.rides
     set status = v_new, cancel_reason = p_reason, completed_at = now()
   where id = p_ride
   returning * into v_ride;

  if v_fee > 0 then
    -- Compensation du chauffeur mobilisé.
    perform public.post_ledger(v_ride.driver_id, 'cancellation', v_fee, p_ride);
    if v_ride.payment_method = 'airtel' then
      insert into public.payments (ride_id, driver_id, kind, provider, direction, amount, currency, partner_txn_id, status)
      values (p_ride, v_ride.driver_id, 'cancellation_fee', 'airtel', 'in', v_fee, 'XAF',
              'cancel-'||p_ride::text, 'initiated')
      on conflict (partner_txn_id) do nothing;
    end if;
    perform public.enqueue_notification(v_ride.client_id, 'cancellation_fee',
      jsonb_build_object('ride_id', p_ride, 'fee', v_fee));
  end if;

  insert into public.ride_events (ride_id, type, actor, meta)
  values (p_ride, 'cancelled', v_uid,
          jsonb_build_object('status', v_new, 'reason', p_reason, 'fee', v_fee));
  return v_ride;
end;
$$;

-- ----------------------------------------------------------------------------
-- E-07 · Courses planifiées : bascule en dispatch à l'approche de l'heure.
-- ----------------------------------------------------------------------------
create or replace function public.activate_scheduled_rides()
returns integer
language plpgsql security definer set search_path = public
as $$
declare r record; v_count integer := 0;
  v_lead integer := coalesce((select value::text::int from public.app_config where key = 'scheduled_lead_min'), 15);
begin
  perform public.assert_admin_or_service();
  for r in select id from public.rides
            where scheduled_at is not null
              and status = 'requested' and driver_id is null
              and scheduled_at <= now() + make_interval(mins => v_lead)
              and not exists (select 1 from public.ride_offers o where o.ride_id = rides.id)
  loop
    insert into public.ride_events (ride_id, type, meta)
    values (r.id, 'scheduled_activated', '{}');
    perform public.offer_next_driver(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- E-02 · Rappels d'échéance avant la coupure 04:00 (reminder_window_min).
-- ----------------------------------------------------------------------------
create or replace function public.send_settlement_reminders()
returns integer
language plpgsql security definer set search_path = public
as $$
declare r record; v_count integer := 0;
  v_window integer := coalesce((select value::text::int from public.app_config where key = 'reminder_window_min'), 120);
  v_cutoff timestamptz;
begin
  perform public.assert_admin_or_service();
  -- Prochaine coupure 04:00 Africa/Libreville.
  v_cutoff := (date_trunc('day', now() at time zone 'Africa/Libreville') + interval '4 hours')
              at time zone 'Africa/Libreville';
  if v_cutoff <= now() then v_cutoff := v_cutoff + interval '1 day'; end if;
  if v_cutoff - now() > make_interval(mins => v_window) then return 0; end if;

  for r in select d.id, public.driver_balance(d.id) as bal
             from public.drivers d
            where d.is_active and public.driver_balance(d.id) < 0
  loop
    if not exists (select 1 from public.notifications n
                    where n.user_id = r.id and n.type = 'settlement_reminder'
                      and n.created_at > now() - make_interval(mins => v_window)) then
      perform public.enqueue_notification(r.id, 'settlement_reminder',
        jsonb_build_object('balance', r.bal, 'cutoff_at', v_cutoff));
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- E-14 · Validation KYC atomique : statut chauffeur + rôle + notification.
-- ----------------------------------------------------------------------------
create or replace function public.validate_kyc(
  p_driver uuid, p_accept boolean, p_note text default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not (public.is_admin() and (public.has_admin_role('ops') or public.is_superadmin())) then
    raise exception 'Réservé aux admins ops';
  end if;
  if not exists (select 1 from public.drivers where id = p_driver) then
    raise exception 'Chauffeur introuvable';
  end if;
  perform public.set_service_mode(true);
  if p_accept then
    update public.drivers set kyc_status = 'validated', is_active = true where id = p_driver;
    update public.profiles set role = 'driver' where id = p_driver;
  else
    update public.drivers set kyc_status = 'rejected', is_active = false,
           deactivated_reason = coalesce(p_note, 'kyc_rejected') where id = p_driver;
  end if;
  perform public.set_service_mode(false);
  insert into public.audit_log (actor, action, entity, entity_id, after)
  values (auth.uid(), case when p_accept then 'kyc_validated' else 'kyc_rejected' end,
          'driver', p_driver::text, jsonb_build_object('note', p_note));
  perform public.enqueue_notification(p_driver,
    case when p_accept then 'kyc_validated' else 'kyc_rejected' end,
    jsonb_build_object('note', p_note));
end;
$$;

-- ----------------------------------------------------------------------------
-- E-13 · Validation d'une route proposée → segment routable (pipeline carto).
-- ----------------------------------------------------------------------------
create or replace function public.validate_road_proposal(p_proposal uuid, p_accept boolean)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_prop public.road_proposals; v_seg uuid;
begin
  if not (public.is_admin() and (public.has_admin_role('carto') or public.is_superadmin())) then
    raise exception 'Réservé aux admins carto';
  end if;
  select * into v_prop from public.road_proposals where id = p_proposal for update;
  if v_prop is null then raise exception 'Proposition introuvable'; end if;
  if v_prop.status <> 'proposed' then raise exception 'Proposition déjà traitée (%)', v_prop.status; end if;

  if not p_accept then
    update public.road_proposals set status = 'rejected', reviewed_by = auth.uid() where id = p_proposal;
    return null;
  end if;

  insert into public.road_segments (geom, source, status, attributes, created_by, validated_by)
  values (v_prop.geom, 'driver', 'validated',
          jsonb_build_object('derived_from_proposal', p_proposal) || v_prop.derived_from,
          null, auth.uid())
  returning id into v_seg;
  update public.road_proposals set status = 'merged', reviewed_by = auth.uid() where id = p_proposal;
  insert into public.audit_log (actor, action, entity, entity_id, after)
  values (auth.uid(), 'road_validated', 'road_segment', v_seg::text,
          jsonb_build_object('proposal_id', p_proposal));
  return v_seg;
end;
$$;

-- ----------------------------------------------------------------------------
-- E-17 · Le proposant d'un repère est notifié du verdict (C-26/C-31).
-- ----------------------------------------------------------------------------
create or replace function public.validate_landmark_proposal(p_proposal uuid, p_accept boolean)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_prop public.landmark_proposals; v_id uuid;
  v_src public.geo_source;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  select * into v_prop from public.landmark_proposals where id = p_proposal for update;
  if v_prop is null then raise exception 'Proposition introuvable'; end if;
  if v_prop.status <> 'proposed' then raise exception 'Proposition déjà traitée (%)', v_prop.status; end if;

  if not p_accept then
    update public.landmark_proposals set status = 'rejected', reviewed_by = auth.uid() where id = p_proposal;
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
  if v_prop.proposed_by is not null then
    perform public.enqueue_notification(v_prop.proposed_by, 'landmark_accepted',
      jsonb_build_object('proposal_id', p_proposal, 'landmark_id', v_id, 'name', v_prop.name));
  end if;
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- E-11 · Bucket photos de repères : upload par le proposant, lecture publique.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('landmarks', 'landmarks', true)
on conflict (id) do nothing;

create policy "landmarks_photos_insert_own"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'landmarks' and (storage.foldername(name))[1] = auth.uid()::text );
create policy "landmarks_photos_read"
  on storage.objects for select
  using ( bucket_id = 'landmarks' );

-- ----------------------------------------------------------------------------
-- E-02 · pg_cron : l'horloge qui manquait. Les jobs tournent en rôle postgres
-- (pas de JWT → assert_admin_or_service passe). Libreville = UTC+1 sans
-- heure d'été : 04:00 locale = 03:00 UTC.
-- ----------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule('teko-daily-close',        '0 3 * * *',    $$select public.daily_close();$$);
select cron.schedule('teko-expire-offers',      '15 seconds',   $$select public.expire_stale_offers();$$);
select cron.schedule('teko-scheduled-rides',    '* * * * *',    $$select public.activate_scheduled_rides();$$);
select cron.schedule('teko-settlement-reminders','*/15 * * * *',$$select public.send_settlement_reminders();$$);
select cron.schedule('teko-purge-accounts',     '30 2 * * *',   $$select public.purge_deleted_accounts();$$);
