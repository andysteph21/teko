-- Après la première validation, seul Ops peut modifier l'identité du véhicule,
-- dans un dossier rouvert et désactivé. Une nouvelle vérification est obligatoire.
alter table public.drivers add column vehicle_locked_at timestamptz;
update public.drivers set vehicle_locked_at=now() where kyc_status='validated';

create function private.guard_driver_vehicle_identity()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if tg_op='UPDATE' and coalesce(auth.role(),'')='authenticated'
    and coalesce(current_setting('teko.service',true),'')<>'on' then
    if new.vehicle_locked_at is distinct from old.vehicle_locked_at then
      raise exception 'Verrou véhicule réservé au serveur' using errcode='42501';
    end if;
    if new.categories is distinct from old.categories and old.vehicle_locked_at is not null
      and not((public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops')))
        and not old.is_active and old.kyc_status='pending') then
      raise exception 'Catégorie verrouillée : nouvelle vérification Ops requise' using errcode='42501';
    end if;
  end if;
  if new.kyc_status='validated' then new.vehicle_locked_at:=coalesce(new.vehicle_locked_at,now()); end if;
  return new;
end;
$$;
revoke all on function private.guard_driver_vehicle_identity() from public,anon,authenticated;
create trigger drivers_vehicle_identity before insert or update on public.drivers
  for each row execute function private.guard_driver_vehicle_identity();

create function private.guard_vehicle_change()
returns trigger language plpgsql security definer set search_path=public
as $$
declare driver public.drivers; target uuid;
begin
  if coalesce(auth.role(),'')<>'authenticated' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='UPDATE' and new.driver_id<>old.driver_id then
    raise exception 'Propriétaire du véhicule immuable' using errcode='42501';
  end if;
  if tg_op='DELETE' then target:=old.driver_id; else target:=new.driver_id; end if;
  select * into driver from public.drivers where id=target for update;
  if driver.vehicle_locked_at is not null and not(
    (public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops')))
    and not driver.is_active and driver.kyc_status='pending') then
    raise exception 'Véhicule verrouillé : nouvelle vérification Ops requise' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function private.guard_vehicle_change() from public,anon,authenticated;
create trigger vehicles_guard_changes before insert or update or delete on public.vehicles
  for each row execute function private.guard_vehicle_change();

create function public.reopen_vehicle_review(p_driver uuid,p_reason text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops'))) then
    raise exception 'Révision réservée aux opérations' using errcode='42501';
  end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 1000 then
    raise exception 'Motif de révision requis' using errcode='22023';
  end if;
  perform 1 from public.drivers where id=p_driver for update;
  if not found then raise exception 'Chauffeur introuvable' using errcode='22023'; end if;
  if exists(select 1 from public.rides where driver_id=p_driver and status in ('accepted','enroute','arrived','started')) then
    raise exception 'Attendre la fin de la course avant de changer le véhicule' using errcode='22023';
  end if;
  perform public.set_service_mode(true);
  update public.drivers set is_active=false,kyc_status='pending',deactivated_reason='vehicle_review',
    physical_verified_at=null,physical_verified_by=null where id=p_driver;
  perform public.set_service_mode(false);
  delete from public.driver_presence where driver_id=p_driver;
  update public.ride_offers set expires_at=least(expires_at,now()) where driver_id=p_driver and status='pending';
  update public.driver_documents set status='pending',note='Nouvelle vérification du véhicule requise' where driver_id=p_driver;
  insert into public.audit_log(actor,action,entity,entity_id,after)
    values(auth.uid(),'vehicle_review_reopened','driver',p_driver::text,jsonb_build_object('reason',trim(p_reason)));
end;
$$;
revoke all on function public.reopen_vehicle_review(uuid,text) from public,anon;
grant execute on function public.reopen_vehicle_review(uuid,text) to authenticated;
notify pgrst,'reload schema';
