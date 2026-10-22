-- Décision du 19 octobre : montants au multiple de 25, égalité vers le haut.
-- Les devis, créances et écritures déjà enregistrés ne sont pas réécrits.
create function private.round_cash_amount(p_amount numeric)
returns numeric language sql immutable strict
as $$ select round(p_amount/25)*25 $$;
revoke all on function private.round_cash_amount(numeric) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.round_cash_amount(numeric) to service_role;

-- Modifier les expressions seules préserve les ACL et les gardes des RPC.
do $$
declare change record; original text; updated text;
begin
  for change in select * from (values
    ('public.commission_amount(numeric)',
      'round(p_price * cval / 100.0, 2)', 'private.round_cash_amount(p_price * cval / 100.0)'),
    ('public.commission_amount(numeric)',
      'round(cval, 2)', 'private.round_cash_amount(cval)'),
    ('public.estimate_price(public.vehicle_category,integer,integer,uuid)',
      'return round(greatest(v, r.min_fare), 0);',
      'return greatest(private.round_cash_amount(v),ceil(r.min_fare/25)*25);'),
    ('public.estimate_cancellation_fee(uuid)',
      'return round(greatest(v_fixed, v_pct / 100.0 * coalesce(v_ride.price_est, 0)));',
      'return private.round_cash_amount(greatest(v_fixed, v_pct / 100.0 * coalesce(v_ride.price_est, 0)));'),
    ('public.cancel_ride(uuid,text,public.ride_status)',
      'share:=public.cancellation_driver_share(fee,cfg);',
      'fee:=private.round_cash_amount(fee); share:=public.cancellation_driver_share(fee,cfg);'),
    ('public.cancellation_driver_share(numeric,jsonb)',
      'select round(', 'select private.round_cash_amount(')
  ) as edits(signature,before,after)
  loop
    original:=pg_get_functiondef(change.signature::regprocedure);
    updated:=replace(original,change.before,change.after);
    if updated=original then
      raise exception 'Expression d''arrondi attendue absente : %',change.signature;
    end if;
    execute updated;
  end loop;
end;
$$;
notify pgrst,'reload schema';
