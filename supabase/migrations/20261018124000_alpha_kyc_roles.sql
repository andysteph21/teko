-- Séparation des fonctions approuvée le 18 octobre : KYC Ops, finance Finance.
alter policy documents_select_owner_or_admin on public.driver_documents to authenticated
  using(driver_id=auth.uid() or public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops')));
alter policy documents_update_admin on public.driver_documents to authenticated
  using(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops')))
  with check(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops')));
alter policy documents_insert_owner on public.driver_documents to authenticated
  with check(driver_id=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null
    and note is null and split_part(storage_path,'/',1)=auth.uid()::text
    and exists(select 1 from storage.objects where bucket_id='kyc' and name=storage_path));
alter policy kyc_select_own_or_admin on storage.objects to authenticated
  using(bucket_id='kyc' and((storage.foldername(name))[1]=auth.uid()::text or public.is_superadmin()
    or(public.is_admin() and public.has_admin_role('ops'))));
drop policy kyc_update_own on storage.objects;
drop policy kyc_delete_admin on storage.objects;
update storage.buckets set file_size_limit=10485760,
  allowed_mime_types=array['image/jpeg','image/png','application/pdf'] where id='kyc';

create function private.guard_kyc_document()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if tg_op='INSERT' and exists(select 1 from public.driver_documents where storage_path=new.storage_path) then
    raise exception 'Justificatif déjà utilisé' using errcode='23505';
  elsif tg_op='UPDATE' then
    if new.driver_id<>old.driver_id or new.storage_path<>old.storage_path or new.type<>old.type then
      raise exception 'Identité et preuve du document immuables' using errcode='42501';
    end if;
    new.reviewed_by:=auth.uid(); new.reviewed_at:=now();
    insert into public.audit_log(actor,action,entity,entity_id,after)
      values(auth.uid(),'kyc_document_reviewed','driver_document',new.id::text,
        jsonb_build_object('status',new.status));
  end if;
  return new;
end;
$$;
revoke all on function private.guard_kyc_document() from public,anon,authenticated;
create trigger driver_documents_guard_evidence before insert or update on public.driver_documents
  for each row execute function private.guard_kyc_document();

alter table public.drivers add column physical_verified_at timestamptz;
alter table public.drivers add column physical_verified_by uuid references public.profiles(id);
alter policy drivers_insert_self_or_admin on public.drivers to authenticated
  with check((id=auth.uid() or public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops')))
    and kyc_status='pending' and not is_active and current_balance_cache=0 and rating_avg=0
    and physical_verified_at is null and physical_verified_by is null);
create function public.record_physical_verification(p_driver uuid,p_note text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops'))) then
    raise exception 'Vérification réservée aux opérations' using errcode='42501';
  end if;
  if p_note is null or length(trim(p_note)) not between 3 and 1000 then
    raise exception 'Compte rendu de vérification requis' using errcode='22023';
  end if;
  perform public.set_service_mode(true);
  update public.drivers set physical_verified_at=now(),physical_verified_by=auth.uid() where id=p_driver;
  if not found then raise exception 'Chauffeur introuvable'; end if;
  perform public.set_service_mode(false);
  insert into public.audit_log(actor,action,entity,entity_id,after)
    values(auth.uid(),'driver_physically_verified','driver',p_driver::text,jsonb_build_object('note',trim(p_note)));
end;
$$;
revoke all on function public.record_physical_verification(uuid,text) from public,anon;
grant execute on function public.record_physical_verification(uuid,text) to authenticated,service_role;

create function private.kyc_ready(p_driver uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.drivers where id=p_driver and physical_verified_at is not null)
    and not exists(select 1 from unnest(enum_range(null::public.document_type)) required(type)
      where not exists(select 1 from public.driver_documents d
        where d.driver_id=p_driver and d.type=required.type and d.status='validated'
          and exists(select 1 from storage.objects o where o.bucket_id='kyc' and o.name=d.storage_path)
          and not exists(select 1 from public.driver_documents newer where newer.driver_id=d.driver_id
            and newer.type=d.type and newer.created_at>d.created_at)));
$$;
revoke all on function private.kyc_ready(uuid) from public,anon,authenticated;

create or replace function public.guard_driver_sensitive_change()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if coalesce(current_setting('teko.service',true),'')='on' then return new; end if;
  if new.kyc_status is distinct from old.kyc_status
    or new.rating_avg is distinct from old.rating_avg
    or new.current_balance_cache is distinct from old.current_balance_cache
    or new.physical_verified_at is distinct from old.physical_verified_at
    or new.physical_verified_by is distinct from old.physical_verified_by then
    raise exception 'Champs sensibles réservés aux opérations serveur' using errcode='42501';
  end if;
  if new.is_active is distinct from old.is_active or new.deactivated_reason is distinct from old.deactivated_reason then
    if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops'))) then
      raise exception 'Activation réservée aux opérations' using errcode='42501';
    end if;
    if new.is_active and(new.kyc_status<>'validated' or not private.kyc_ready(new.id)) then
      raise exception 'Sept pièces validées et vérification physique requises' using errcode='22023';
    end if;
  end if;
  return new;
end;
$$;

alter function public.validate_kyc(uuid,boolean,text) rename to _validate_kyc;
revoke all on function public._validate_kyc(uuid,boolean,text) from public,anon,authenticated;
create function public.validate_kyc(p_driver uuid,p_accept boolean,p_note text default null)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops'))) then
    raise exception 'Validation réservée aux opérations' using errcode='42501';
  end if;
  perform 1 from public.drivers where id=p_driver for update;
  if p_accept then
    if not private.kyc_ready(p_driver) then
      raise exception 'Sept pièces validées et vérification physique requises' using errcode='22023';
    end if;
    if not exists(select 1 from auth.users u join public.alpha_invites i on i.phone=u.phone
      where u.id=p_driver and u.phone_confirmed_at is not null and i.role='driver' and i.is_active) then
      raise exception 'Invitation chauffeur requise' using errcode='42501';
    end if;
  end if;
  perform public._validate_kyc(p_driver,p_accept,p_note);
end;
$$;
revoke all on function public.validate_kyc(uuid,boolean,text) from public,anon;
grant execute on function public.validate_kyc(uuid,boolean,text) to authenticated,service_role;

-- Les comptes de développement existants ne deviennent pas implicitement conformes.
do $$ begin
  perform public.set_service_mode(true);
  update public.drivers set is_active=false,deactivated_reason='alpha_kyc_incomplete'
    where is_active and not private.kyc_ready(id);
  perform public.set_service_mode(false);
end $$;

alter policy ledger_select_owner_or_admin on public.ledger to authenticated
  using(driver_id=auth.uid() or public.is_superadmin() or(public.is_admin() and public.has_admin_role('finance')));
alter policy statements_select_owner_or_admin on public.daily_statements to authenticated
  using(driver_id=auth.uid() or public.is_superadmin() or(public.is_admin() and public.has_admin_role('finance')));
alter policy payments_select_scoped on public.payments to authenticated
  using(driver_id=auth.uid() or public.is_superadmin() or(public.is_admin() and public.has_admin_role('finance'))
    or exists(select 1 from public.rides where id=payments.ride_id and client_id=auth.uid()));
notify pgrst,'reload schema';
