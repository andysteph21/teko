-- Ops prépare, Finance/superadmin valide ; référence et justificatif obligatoires.
create table public.manual_receipts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id),
  claim_id uuid references public.cancellation_claims(id),
  kind text not null check(kind in ('settlement','cancellation_fee','payout')),
  amount numeric(12,2) not null check(amount>0),
  method text not null check(method in ('cash','external_transfer')),
  reference text not null unique check(length(reference) between 3 and 160),
  proof_path text not null unique,
  status text not null default 'pending' check(status in ('pending','approved')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  payment_id uuid unique references public.payments(id),
  check((kind='cancellation_fee')=(claim_id is not null))
);
alter table public.manual_receipts enable row level security;
revoke all on public.manual_receipts from public,anon,authenticated;
grant select on public.manual_receipts to authenticated;
grant all on public.manual_receipts to service_role;
create policy receipts_read_admin on public.manual_receipts for select to authenticated
  using(public.is_superadmin() or(public.is_admin() and
    (public.has_admin_role('finance') or public.has_admin_role('ops'))));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('finance-proofs','finance-proofs',false,10485760,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do nothing;
create policy finance_proofs_insert on storage.objects for insert to authenticated
  with check(bucket_id='finance-proofs' and (storage.foldername(name))[1]=auth.uid()::text
    and(public.is_superadmin() or(public.is_admin() and
      (public.has_admin_role('ops') or public.has_admin_role('finance')))));
create policy finance_proofs_read on storage.objects for select to authenticated
  using(bucket_id='finance-proofs' and(public.is_superadmin() or(public.is_admin() and
    (public.has_admin_role('ops') or public.has_admin_role('finance')))));

create function public.prepare_manual_receipt(
  p_driver uuid,p_kind text,p_amount numeric,p_method text,
  p_reference text,p_proof_path text,p_claim uuid default null
) returns public.manual_receipts language plpgsql security definer set search_path=public
as $$
declare receipt public.manual_receipts; claim public.cancellation_claims;
begin
  if not(public.is_superadmin() or(public.is_admin() and
    (public.has_admin_role('ops') or public.has_admin_role('finance')))) then
    raise exception 'Préparation réservée aux opérations et à Finance' using errcode='42501';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='finance-proofs'
    and name=p_proof_path and (storage.foldername(name))[1]=auth.uid()::text) then
    raise exception 'Justificatif privé requis' using errcode='22023';
  end if;
  if p_kind='cancellation_fee' then
    select * into claim from public.cancellation_claims where id=p_claim for update;
    if not found or claim.status<>'pending' or claim.driver_id<>p_driver
      or claim.amount<>p_amount then
      raise exception 'Créance ou montant invalide' using errcode='22023';
    end if;
  end if;
  insert into public.manual_receipts(driver_id,claim_id,kind,amount,method,reference,proof_path,created_by)
    values(p_driver,p_claim,p_kind,p_amount,p_method,upper(trim(p_reference)),p_proof_path,auth.uid())
    returning * into receipt;
  insert into public.audit_log(actor,action,entity,entity_id,after)
    values(auth.uid(),'manual_receipt_prepared','manual_receipt',receipt.id::text,
      jsonb_build_object('amount',receipt.amount,'method',receipt.method,'kind',receipt.kind));
  return receipt;
end;
$$;
revoke all on function public.prepare_manual_receipt(uuid,text,numeric,text,text,text,uuid) from public,anon;
grant execute on function public.prepare_manual_receipt(uuid,text,numeric,text,text,text,uuid) to authenticated,service_role;

-- La confirmation d'un frais manuel utilise la part figée dans la créance,
-- plutôt que de recalculer 70 % sur une configuration éventuellement modifiée.
alter function public.confirm_payment(uuid) rename to _confirm_payment;
revoke all on function public._confirm_payment(uuid) from public,anon,authenticated;
create function public.confirm_payment(p_payment uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare p public.payments; c public.cancellation_claims;
begin
  select * into p from public.payments where id=p_payment for update;
  if not found then raise exception 'Paiement introuvable'; end if;
  if p.status='success' then return; end if;
  if p.provider='manual' and p.kind='cancellation_fee' then
    select * into c from public.cancellation_claims where ride_id=p.ride_id for update;
    if not found or c.status<>'pending' or c.amount<>p.amount then
      raise exception 'Créance non disponible';
    end if;
    perform public.post_ledger(p.driver_id,'cancellation',c.driver_share,p.ride_id,p.id);
    update public.payments set status='success',updated_at=now() where id=p.id;
    update public.cancellation_claims set status='collected',collected_at=now() where id=c.id;
  else perform public._confirm_payment(p_payment);
  end if;
end;
$$;
revoke all on function public.confirm_payment(uuid) from public,anon,authenticated;
grant execute on function public.confirm_payment(uuid) to service_role;

create function public.approve_manual_receipt(p_receipt uuid)
returns public.manual_receipts language plpgsql security definer set search_path=public
as $$
declare r public.manual_receipts; p uuid; ride uuid;
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('finance'))) then
    raise exception 'Validation réservée à Finance' using errcode='42501';
  end if;
  select * into r from public.manual_receipts where id=p_receipt for update;
  if not found then raise exception 'Reçu introuvable'; end if;
  if r.status='approved' then return r; end if;
  if not exists(select 1 from storage.objects where bucket_id='finance-proofs' and name=r.proof_path) then
    raise exception 'Justificatif indisponible';
  end if;
  perform 1 from public.drivers where id=r.driver_id for update;
  if r.kind='payout' and public._driver_balance(r.driver_id)<r.amount then
    raise exception 'Versement supérieur au solde disponible' using errcode='22023';
  end if;
  if r.claim_id is not null then
    select ride_id into ride from public.cancellation_claims where id=r.claim_id;
  end if;
  insert into public.payments(driver_id,ride_id,kind,provider,direction,amount,currency,partner_txn_id,status)
    values(r.driver_id,ride,
      case r.kind when 'settlement' then 'driver_settlement'::public.payment_kind
        when 'payout' then 'payout'::public.payment_kind else 'cancellation_fee'::public.payment_kind end,
      'manual',case when r.kind='payout' then 'out'::public.payment_direction else 'in'::public.payment_direction end,
      r.amount,'XAF','manual-'||r.id::text,'initiated') returning id into p;
  perform public.confirm_payment(p);
  update public.manual_receipts set status='approved',payment_id=p,
    approved_by=auth.uid(),approved_at=now() where id=r.id returning * into r;
  insert into public.audit_log(actor,action,entity,entity_id,after)
    values(auth.uid(),'manual_receipt_approved','manual_receipt',r.id::text,
      jsonb_build_object('payment_id',p,'amount',r.amount,'kind',r.kind));
  return r;
end;
$$;
revoke all on function public.approve_manual_receipt(uuid) from public,anon;
grant execute on function public.approve_manual_receipt(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
