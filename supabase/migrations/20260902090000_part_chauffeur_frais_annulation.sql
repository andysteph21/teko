-- ============================================================================
-- Teko — Part chauffeur des frais d'annulation + no-show réellement payé.
--
-- Écart relevé en validation générale (1er sept. 2026) : cancel_ride créditait
-- 100 % du frais au chauffeur alors que la décision client n° 5 (25 août 2026,
-- docs/plan/04-suivi-client.md) fixe la « part chauffeur » à 70 %.
--
-- Désormais :
--   · le CLIENT doit toujours le frais ENTIER — notification `cancellation_fee`,
--     paiement Airtel initié et estimate_cancellation_fee (C-21) inchangés ;
--   · le CHAUFFEUR est crédité au grand livre de `driver_share_percent`
--     (app_config.cancellation_fee, défaut 70 %), arrondi à l'unité — le reste
--     revient à Teko ;
--   · confirm_payment ne recrédite PLUS un paiement `cancellation_fee` (Airtel) :
--     le chauffeur a déjà été compensé à l'annulation. Le double crédit était
--     latent (jamais exercé : aucun encaissement Airtel de frais n'est initié
--     côté app pour l'instant).
-- Le statut `no_show` (frais dédié 1 000 F) existait déjà côté SQL ; c'est
-- l'enveloppe api-client qui ne l'exposait pas (dette n° 3 du doc 12) —
-- corrigé côté packages/api-client + app chauffeur dans le même lot.
-- ============================================================================

update public.app_config
   set value = value || '{"driver_share_percent":70}'::jsonb
 where key = 'cancellation_fee' and not (value ? 'driver_share_percent');

-- Part du chauffeur sur un frais d'annulation (arrondi à l'unité XAF).
create or replace function public.cancellation_driver_share(p_fee numeric, p_cfg jsonb)
returns numeric
language sql immutable
as $$
  select round(coalesce(p_fee, 0)
               * least(greatest(coalesce((p_cfg->>'driver_share_percent')::numeric, 70), 0), 100)
               / 100.0);
$$;

create or replace function public.cancel_ride(
  p_ride uuid, p_reason text default null, p_status public.ride_status default null
) returns public.rides
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); v_ride public.rides; v_new public.ride_status;
  v_cfg jsonb; v_fee numeric := 0; v_share numeric := 0; v_prev public.ride_status;
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
    -- Compensation du chauffeur mobilisé : sa part seulement (décision n° 5).
    v_share := public.cancellation_driver_share(v_fee, v_cfg);
    if v_share > 0 then
      perform public.post_ledger(v_ride.driver_id, 'cancellation', v_share, p_ride);
    end if;
    -- Le client doit le frais entier.
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
          jsonb_build_object('status', v_new, 'reason', p_reason, 'fee', v_fee, 'driver_share', v_share));
  return v_ride;
end;
$$;

-- confirm_payment : le frais d'annulation encaissé par Airtel ne donne plus
-- lieu à une seconde écriture « cancellation » (déjà postée par cancel_ride).
create or replace function public.confirm_payment(p_payment uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare pmt public.payments; cred numeric;
begin
  select * into pmt from public.payments where id = p_payment for update;
  if pmt is null then raise exception 'Paiement introuvable: %', p_payment; end if;
  if pmt.status = 'success' then return; end if;   -- idempotence

  update public.payments set status = 'success', updated_at = now() where id = p_payment;

  if pmt.kind = 'ride_collection' then
    -- client paie P à Teko -> chauffeur crédité de (P - commission)
    cred := pmt.amount - public.commission_amount(pmt.amount);
    perform public.post_ledger(pmt.driver_id, 'mobile_credit', cred, pmt.ride_id, p_payment);
  elsif pmt.kind = 'driver_settlement' then
    perform public.post_ledger(pmt.driver_id, 'settlement', pmt.amount, null, p_payment);
    perform public.maybe_reactivate_driver(pmt.driver_id);
  elsif pmt.kind = 'payout' then
    perform public.post_ledger(pmt.driver_id, 'payout', -pmt.amount, null, p_payment);
  elsif pmt.kind = 'cancellation_fee' then
    -- Recouvrement du frais auprès du client : la part chauffeur a été créditée
    -- par cancel_ride au moment de l'annulation (migration 20260902090000).
    null;
  elsif pmt.kind = 'refund' then
    perform public.post_ledger(pmt.driver_id, 'adjustment', -pmt.amount, pmt.ride_id, p_payment);
  end if;
end;
$$;
