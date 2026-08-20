-- ============================================================================
-- Teko — 0012 : Clôture journalière (04:00) — relevés, désactivations, payouts
-- Modèle "report" : le solde est cumulatif (pas de remise à zéro). La clôture
-- prend un instantané du jour et applique les conséquences.
-- ============================================================================

create or replace function public.daily_close(p_day date default public.business_day())
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_opening numeric;
  v_closing numeric;
  v_commission numeric;
  v_credit numeric;
  v_threshold numeric;
  v_status public.statement_status;
  v_count integer := 0;
begin
  v_threshold := coalesce(nullif((select value::text from public.app_config where key='payout_threshold'),'')::numeric, 0);

  for r in
    select distinct driver_id from public.ledger where business_day <= p_day
  loop
    select coalesce(sum(amount_signed),0) into v_opening
      from public.ledger where driver_id = r.driver_id and business_day < p_day;
    select coalesce(sum(amount_signed),0) into v_closing
      from public.ledger where driver_id = r.driver_id and business_day <= p_day;
    select coalesce(-sum(amount_signed),0) into v_commission
      from public.ledger where driver_id = r.driver_id and business_day = p_day and kind = 'commission_due';
    select coalesce(sum(amount_signed),0) into v_credit
      from public.ledger where driver_id = r.driver_id and business_day = p_day and kind = 'mobile_credit';

    if v_closing < 0 then
      v_status := 'overdue';
      perform public.set_service_mode(true);
      update public.drivers
         set is_active = false, deactivated_reason = 'overdue_balance'
       where id = r.driver_id;
      perform public.set_service_mode(false);
    elsif v_closing > v_threshold then
      v_status := 'paid_out';
      -- enqueue un payout (exécuté ensuite par l'Edge Function ; ledger posté à la confirmation)
      insert into public.payments (driver_id, kind, provider, direction, amount, currency, partner_txn_id, status)
      values (r.driver_id, 'payout', 'airtel', 'out', v_closing, 'XAF',
              'payout-'||r.driver_id::text||'-'||p_day::text, 'initiated')
      on conflict (partner_txn_id) do nothing;
    else
      v_status := 'settled';
    end if;

    insert into public.daily_statements
      (driver_id, business_day, opening, closing, total_commission, total_mobile_credit, payout_amount, status)
    values
      (r.driver_id, p_day, v_opening, v_closing, v_commission, v_credit,
       case when v_status = 'paid_out' then v_closing else null end, v_status)
    on conflict (driver_id, business_day) do update
      set opening = excluded.opening,
          closing = excluded.closing,
          total_commission = excluded.total_commission,
          total_mobile_credit = excluded.total_mobile_credit,
          payout_amount = excluded.payout_amount,
          status = excluded.status,
          updated_at = now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.daily_close(date)
  is 'Clôture journalière : relevés, désactivation des soldes négatifs, enqueue des payouts. Idempotente.';
