-- ============================================================================
-- Teko — Fiche chauffeur pour les participants d'une course (C-13/C-16/C-17,
-- constat RLS du lot 3 : profiles/vehicles = self-or-admin, le passager ne
-- peut rien lire). Expose LE STRICT NÉCESSAIRE des maquettes : prénom, note
-- moyenne, plaque, catégorie du véhicule — jamais le téléphone ni l'id.
-- ============================================================================

create or replace function public.ride_driver_card(p_ride uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_ride   public.rides;
  v_name   text;
  v_rating numeric;
  v_plate  text;
  v_categ  public.vehicle_category;
begin
  select * into v_ride from public.rides where id = p_ride;
  if v_ride.id is null then
    raise exception 'Course introuvable';
  end if;
  if v_ride.client_id <> auth.uid()
     and coalesce(v_ride.driver_id, '00000000-0000-0000-0000-000000000000') <> auth.uid()
     and not public.is_admin() then
    raise exception 'Réservé aux participants';
  end if;
  if v_ride.driver_id is null then
    return null;
  end if;

  select split_part(coalesce(pr.full_name, ''), ' ', 1)
    into v_name
    from public.profiles pr where pr.id = v_ride.driver_id;

  select round(avg(r.stars)::numeric, 1)
    into v_rating
    from public.ratings r where r.to_user = v_ride.driver_id;

  select v.plate, v.category
    into v_plate, v_categ
    from public.vehicles v
   where v.driver_id = v_ride.driver_id
   order by v.created_at desc
   limit 1;

  return jsonb_build_object(
    'first_name', nullif(v_name, ''),
    'rating',     v_rating,
    'plate',      v_plate,
    'category',   v_categ
  );
end;
$$;

revoke all on function public.ride_driver_card(uuid) from public;
grant execute on function public.ride_driver_card(uuid) to authenticated;
