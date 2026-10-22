-- Le prix ferme ne peut pas être remplacé par le chauffeur à la clôture.
alter function public.complete_ride(uuid, numeric) rename to _complete_ride;
revoke execute on function public._complete_ride(uuid, numeric)
  from public, anon, authenticated;

create function public.complete_ride(p_ride uuid, p_price_final numeric default null)
returns public.rides language plpgsql security definer set search_path = public
as $$
declare r public.rides;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found then raise exception 'Course introuvable'; end if;
  if r.driver_id is distinct from auth.uid() then
    raise exception 'Action réservée au chauffeur assigné' using errcode = '42501';
  end if;
  if p_price_final is not null and p_price_final is distinct from r.price_est then
    raise exception 'Le prix annoncé ne peut pas être modifié' using errcode = '22023';
  end if;
  if r.price_est is null or r.price_est <= 0 then
    raise exception 'Prix de course invalide' using errcode = '22023';
  end if;
  return public._complete_ride(p_ride, null);
end;
$$;
revoke execute on function public.complete_ride(uuid, numeric) from public, anon;
grant execute on function public.complete_ride(uuid, numeric) to authenticated, service_role;
notify pgrst, 'reload schema';
