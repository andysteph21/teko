-- Refus motivé puis nouvelle version : la référence reste celle du dossier.
alter table public.manual_receipts drop constraint manual_receipts_status_check;
alter table public.manual_receipts add constraint manual_receipts_status_check
  check(status in ('pending','approved','rejected'));
alter table public.manual_receipts drop constraint manual_receipts_reference_key;
alter table public.manual_receipts add column version integer not null default 1 check(version>0);
alter table public.manual_receipts add column previous_receipt_id uuid unique references public.manual_receipts(id);
alter table public.manual_receipts add column rejected_by uuid references public.profiles(id);
alter table public.manual_receipts add column rejected_at timestamptz;
alter table public.manual_receipts add column rejection_reason text;
alter table public.manual_receipts add constraint manual_receipts_reference_version_key unique(reference,version);
create unique index manual_receipts_one_approved_reference on public.manual_receipts(reference) where status='approved';

create function public.reject_manual_receipt(p_receipt uuid,p_reason text)
returns public.manual_receipts language plpgsql security definer set search_path=public
as $$
declare receipt public.manual_receipts;
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('finance'))) then
    raise exception 'Refus réservé à Finance' using errcode='42501';
  end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 1000 then
    raise exception 'Motif de refus requis' using errcode='22023';
  end if;
  select * into receipt from public.manual_receipts where id=p_receipt for update;
  if not found or receipt.status<>'pending' then raise exception 'Dossier non disponible' using errcode='22023'; end if;
  update public.manual_receipts set status='rejected',rejected_by=auth.uid(),
    rejected_at=now(),rejection_reason=trim(p_reason) where id=receipt.id returning * into receipt;
  insert into public.audit_log(actor,action,entity,entity_id,after)
    values(auth.uid(),'manual_receipt_rejected','manual_receipt',receipt.id::text,
      jsonb_build_object('reason',trim(p_reason),'version',receipt.version));
  return receipt;
end;
$$;
revoke all on function public.reject_manual_receipt(uuid,text) from public,anon;
grant execute on function public.reject_manual_receipt(uuid,text) to authenticated,service_role;

create function public.revise_manual_receipt(p_receipt uuid,p_amount numeric,p_method text,p_proof_path text)
returns public.manual_receipts language plpgsql security definer set search_path=public
as $$
declare previous public.manual_receipts; receipt public.manual_receipts;
begin
  -- prepare_manual_receipt applique les droits Ops/Finance et contrôle la preuve.
  select * into previous from public.manual_receipts where id=p_receipt for update;
  if not found or previous.status<>'rejected' or exists
    (select 1 from public.manual_receipts where previous_receipt_id=previous.id) then
    raise exception 'Révision non disponible' using errcode='22023';
  end if;
  receipt:=public.prepare_manual_receipt(previous.driver_id,previous.kind,p_amount,p_method,
    'revision-'||gen_random_uuid()::text,p_proof_path,previous.claim_id);
  update public.manual_receipts set reference=previous.reference,version=previous.version+1,
    previous_receipt_id=previous.id where id=receipt.id returning * into receipt;
  update public.payout_requests set receipt_id=receipt.id where receipt_id=previous.id and status='pending';
  insert into public.audit_log(actor,action,entity,entity_id,after)
    values(auth.uid(),'manual_receipt_revised','manual_receipt',receipt.id::text,
      jsonb_build_object('previous_id',previous.id,'version',receipt.version));
  return receipt;
end;
$$;
revoke all on function public.revise_manual_receipt(uuid,numeric,text,text) from public,anon;
grant execute on function public.revise_manual_receipt(uuid,numeric,text,text) to authenticated,service_role;

alter function public.approve_manual_receipt(uuid) rename to _approve_manual_receipt_v1;
revoke all on function public._approve_manual_receipt_v1(uuid) from public,anon,authenticated;
create function public.approve_manual_receipt(p_receipt uuid)
returns public.manual_receipts language plpgsql security definer set search_path=public
as $$
declare receipt public.manual_receipts;
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('finance'))) then
    raise exception 'Validation réservée à Finance' using errcode='42501';
  end if;
  select * into receipt from public.manual_receipts where id=p_receipt for update;
  if not found or receipt.status='rejected' then raise exception 'Dossier refusé ou introuvable' using errcode='22023'; end if;
  return public._approve_manual_receipt_v1(p_receipt);
end;
$$;
revoke all on function public.approve_manual_receipt(uuid) from public,anon;
grant execute on function public.approve_manual_receipt(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
