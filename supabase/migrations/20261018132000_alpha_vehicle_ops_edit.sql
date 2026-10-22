-- Une correction de véhicule invalide la vérification précédente dans la même transaction.
create function public.update_reviewed_vehicle(p_vehicle uuid,p_category public.vehicle_category,p_plate text,p_reason text)
returns public.vehicles language plpgsql security definer set search_path=public
as $$
declare vehicle public.vehicles;
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops'))) then
    raise exception 'Modification réservée aux opérations' using errcode='42501';
  end if;
  if p_plate is null or length(trim(p_plate)) not between 2 and 24 or p_category='covoiturage' then
    raise exception 'Plaque et catégorie alpha requises' using errcode='22023';
  end if;
  select * into vehicle from public.vehicles where id=p_vehicle;
  if not found then raise exception 'Véhicule introuvable' using errcode='22023'; end if;
  perform public.reopen_vehicle_review(vehicle.driver_id,p_reason);
  update public.vehicles set category=p_category,plate=upper(trim(p_plate)) where id=p_vehicle returning * into vehicle;
  update public.drivers set categories=(select array_agg(distinct category order by category)
    from public.vehicles where driver_id=vehicle.driver_id) where id=vehicle.driver_id;
  insert into public.audit_log(actor,action,entity,entity_id,after)
    values(auth.uid(),'vehicle_identity_updated','vehicle',vehicle.id::text,
      jsonb_build_object('category',vehicle.category,'plate',vehicle.plate,'reason',trim(p_reason)));
  return vehicle;
end;
$$;
revoke all on function public.update_reviewed_vehicle(uuid,public.vehicle_category,text,text) from public,anon;
grant execute on function public.update_reviewed_vehicle(uuid,public.vehicle_category,text,text) to authenticated;
notify pgrst,'reload schema';
