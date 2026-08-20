-- ============================================================================
-- Teko — 0011 : Moteur de solde journalier (fonctions Postgres)
-- Convention : amount_signed < 0 = le chauffeur DOIT à Teko ; > 0 = Teko doit au chauffeur.
-- Le journal public.ledger fait foi. Toutes les écritures passent par post_ledger.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Commission applicable à un prix, depuis app_config (type percent|fixed)
-- ----------------------------------------------------------------------------
create or replace function public.commission_amount(p_price numeric)
returns numeric
language plpgsql stable security definer set search_path = public
as $$
declare cfg jsonb; ctype text; cval numeric;
begin
  select value into cfg from public.app_config where key = 'commission';
  if cfg is null then return 0; end if;
  ctype := cfg->>'type';
  cval  := nullif(cfg->>'value','')::numeric;
  if cval is null then return 0; end if;
  if ctype = 'percent' then
    return round(p_price * cval / 100.0, 2);
  elsif ctype = 'fixed' then
    return round(cval, 2);
  end if;
  return 0;
end;
$$;

-- ----------------------------------------------------------------------------
-- Solde courant d'un chauffeur (somme des écritures = dernier balance_after)
-- ----------------------------------------------------------------------------
create or replace function public.driver_balance(p_driver uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select balance_after from public.ledger
      where driver_id = p_driver order by id desc limit 1), 0);
$$;

-- ----------------------------------------------------------------------------
-- Écriture atomique au grand livre (verrou sur la ligne chauffeur)
-- ----------------------------------------------------------------------------
create or replace function public.post_ledger(
  p_driver  uuid,
  p_kind    public.ledger_kind,
  p_amount  numeric,
  p_ride    uuid default null,
  p_payment uuid default null,
  p_ts      timestamptz default now()
) returns public.ledger
language plpgsql security definer set search_path = public
as $$
declare prev numeric; newbal numeric; row public.ledger;
begin
  perform public.set_service_mode(true);
  -- sérialise les écritures concurrentes du même chauffeur
  perform 1 from public.drivers where id = p_driver for update;
  prev := public.driver_balance(p_driver);
  newbal := round(prev + p_amount, 2);

  insert into public.ledger (driver_id, business_day, kind, amount_signed, balance_after, ride_id, payment_id, created_at)
  values (p_driver, public.business_day(p_ts), p_kind, round(p_amount,2), newbal, p_ride, p_payment, p_ts)
  returning * into row;

  update public.drivers set current_balance_cache = newbal where id = p_driver;
  perform public.set_service_mode(false);
  return row;
end;
$$;

-- ----------------------------------------------------------------------------
-- Réactivation d'un chauffeur si son solde est régularisé (>= 0) et KYC ok
-- ----------------------------------------------------------------------------
create or replace function public.maybe_reactivate_driver(p_driver uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.driver_balance(p_driver) >= 0 then
    perform public.set_service_mode(true);
    update public.drivers
       set is_active = true, deactivated_reason = null
     where id = p_driver
       and kyc_status = 'validated'
       and is_active = false
       and deactivated_reason = 'overdue_balance';
    perform public.set_service_mode(false);
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Confirmation d'un paiement (appelée par l'Edge Function après callback/enquiry)
-- Idempotent : ne reposte pas si déjà 'success'.
-- ----------------------------------------------------------------------------
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
    perform public.post_ledger(pmt.driver_id, 'cancellation', pmt.amount, pmt.ride_id, p_payment);
  elsif pmt.kind = 'refund' then
    perform public.post_ledger(pmt.driver_id, 'adjustment', -pmt.amount, pmt.ride_id, p_payment);
  end if;
end;
$$;

create or replace function public.fail_payment(p_payment uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.payments
     set status = 'failed',
         raw = coalesce(raw,'{}') || jsonb_build_object('fail_reason', p_reason),
         updated_at = now()
   where id = p_payment and status <> 'success';
end;
$$;
