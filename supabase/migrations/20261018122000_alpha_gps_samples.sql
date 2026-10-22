-- Une reprise réseau ne doit ni dupliquer un point ni lui inventer une date récente.
alter table public.ride_locations add column sample_id text unique;
create function private.guard_gps_sample_time()
returns trigger language plpgsql set search_path=public
as $$
begin
  if new.recorded_at>now()+interval '30 seconds' or new.recorded_at<=now()-interval '24 hours' then
    raise exception 'Point GPS expiré ou horodatage invalide' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_gps_sample_time() from public,anon,authenticated;
create trigger ride_locations_guard_sample_time before insert on public.ride_locations
  for each row execute function private.guard_gps_sample_time();
notify pgrst,'reload schema';
