-- La clôture constate une dette ou prépare un versement ; elle ne prétend
-- jamais qu'un paiement Airtel ou manuel a déjà eu lieu.
create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id),
  business_day date not null,
  amount numeric(14,2) not null check(amount>0),
  status text not null default 'pending' check(status in ('pending','paid')),
  receipt_id uuid unique references public.manual_receipts(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique(driver_id,business_day)
);
alter table public.payout_requests enable row level security;
revoke all on public.payout_requests from public,anon,authenticated;
grant select on public.payout_requests to authenticated;
grant all on public.payout_requests to service_role;
create policy payout_requests_read on public.payout_requests for select to authenticated
  using(driver_id=auth.uid() or public.is_superadmin() or(public.is_admin() and
    (public.has_admin_role('ops') or public.has_admin_role('finance'))));

create or replace function public._daily_close_unguarded(p_day date default public.business_day())
returns integer language plpgsql security definer set search_path=public
as $$
declare r record; opening numeric; closing numeric; commission numeric; credit numeric;
  state public.statement_status; count integer:=0;
begin
  -- Un seul appel de clôture à la fois, y compris depuis cron et la console.
  perform pg_advisory_xact_lock(hashtext('teko-alpha-daily-close'));
  for r in select id from public.drivers where exists
    (select 1 from public.ledger where driver_id=drivers.id and business_day<=p_day)
    order by id for update
  loop
    select coalesce(sum(amount_signed) filter(where business_day<p_day),0),
      coalesce(sum(amount_signed),0),
      coalesce(-sum(amount_signed) filter(where business_day=p_day and kind='commission_due'),0),
      coalesce(sum(amount_signed) filter(where business_day=p_day and kind='mobile_credit'),0)
    into opening,closing,commission,credit from public.ledger
      where driver_id=r.id and business_day<=p_day;
    state:=case when closing<0 then 'overdue'::public.statement_status
      when closing>0 then 'open'::public.statement_status else 'settled'::public.statement_status end;
    if closing<0 and public._driver_balance(r.id)<0 then
      perform public.set_service_mode(true);
      update public.drivers set is_active=false,deactivated_reason='overdue_balance' where id=r.id;
      perform public.set_service_mode(false);
    elsif closing>0 then
      insert into public.payout_requests(driver_id,business_day,amount)
        values(r.id,p_day,closing) on conflict(driver_id,business_day) do nothing;
    end if;
    insert into public.daily_statements(driver_id,business_day,opening,closing,total_commission,
      total_mobile_credit,payout_amount,status)
      values(r.id,p_day,opening,closing,commission,credit,case when closing>0 then closing else null end,state)
      on conflict(driver_id,business_day) do update set opening=excluded.opening,
        closing=excluded.closing,total_commission=excluded.total_commission,
        total_mobile_credit=excluded.total_mobile_credit,payout_amount=excluded.payout_amount,
        status=case when daily_statements.status='paid_out' then 'paid_out'::public.statement_status
          else excluded.status end,updated_at=now();
    count:=count+1;
  end loop;
  return count;
end;
$$;

create function public.prepare_payout_receipt(
  p_request uuid,p_method text,p_reference text,p_proof_path text
) returns public.manual_receipts language plpgsql security definer set search_path=public
as $$
declare request public.payout_requests; receipt public.manual_receipts;
begin
  select * into request from public.payout_requests where id=p_request for update;
  if not found or request.status<>'pending' or request.receipt_id is not null then
    raise exception 'Versement non disponible' using errcode='22023';
  end if;
  receipt:=public.prepare_manual_receipt(request.driver_id,'payout',request.amount,
    p_method,p_reference,p_proof_path);
  update public.payout_requests set receipt_id=receipt.id where id=request.id;
  return receipt;
end;
$$;
revoke all on function public.prepare_payout_receipt(uuid,text,text,text) from public,anon;
grant execute on function public.prepare_payout_receipt(uuid,text,text,text) to authenticated,service_role;

create function private.record_payout_approval()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if new.kind='payout' and new.status='approved' and old.status='pending' then
    update public.daily_statements s set status='paid_out' from public.payout_requests r
      where r.receipt_id=new.id and s.driver_id=r.driver_id and s.business_day=r.business_day;
    update public.payout_requests set status='paid',paid_at=now() where receipt_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.record_payout_approval() from public,anon,authenticated;
create trigger manual_receipts_record_payout after update on public.manual_receipts
  for each row execute function private.record_payout_approval();
notify pgrst,'reload schema';
