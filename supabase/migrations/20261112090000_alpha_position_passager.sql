-- Décision du porteur du 12 novembre 2026 (option A) : le chauffeur voit, en
-- plus du point de rencontre, l'endroit où se trouvait le téléphone du
-- passager à la commande. Visible du chauffeur après acceptation seulement
-- (il devient participant), effacée dès la prise en charge ou la clôture.
-- Table dédiée : aucune signature de commande existante ne change, les APK
-- antérieurs continuent de fonctionner sans transmettre de position.
create table public.ride_client_positions (
  ride_id     uuid primary key references public.rides(id) on delete cascade,
  geom        extensions.geometry(Point, 4326) not null,
  recorded_at timestamptz not null default now()
);
alter table public.ride_client_positions enable row level security;
create policy ride_client_positions_select on public.ride_client_positions
  for select to authenticated using (public.is_ride_participant(ride_id) or public.is_admin());
revoke all on public.ride_client_positions from anon, authenticated;
grant select on public.ride_client_positions to authenticated;

create function public.set_ride_client_position(p_ride uuid, p_point extensions.geometry)
returns void language plpgsql security definer set search_path = public, extensions
as $$
begin
  if p_point is null or st_srid(p_point) <> 4326 or geometrytype(p_point) <> 'POINT'
    or abs(st_x(p_point)) > 180 or abs(st_y(p_point)) > 90 then
    raise exception 'Position invalide' using errcode = '22023';
  end if;
  perform 1 from public.rides
    where id = p_ride and client_id = auth.uid()
      and status in ('requested','accepted','enroute','arrived');
  if not found then
    raise exception 'Course introuvable ou déjà prise en charge' using errcode = '42501';
  end if;
  insert into public.ride_client_positions (ride_id, geom) values (p_ride, p_point)
    on conflict (ride_id) do update set geom = excluded.geom, recorded_at = now();
end;
$$;
revoke all on function public.set_ride_client_position(uuid, extensions.geometry)
  from public, anon;
grant execute on function public.set_ride_client_position(uuid, extensions.geometry)
  to authenticated;

create function private.clear_ride_client_position()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status not in ('requested','accepted','enroute','arrived') then
    delete from public.ride_client_positions where ride_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.clear_ride_client_position() from public, anon, authenticated;
create trigger rides_clear_client_position after update of status on public.rides
  for each row execute function private.clear_ride_client_position();
notify pgrst, 'reload schema';
