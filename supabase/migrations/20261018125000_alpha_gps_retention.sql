-- Décision du porteur : sept jours pour les positions précises de suivi.
create index ride_locations_retention_idx on public.ride_locations(recorded_at);
create policy ride_locations_retention_read on public.ride_locations
  as restrictive for select to authenticated using(recorded_at>now()-interval '7 days');
create function public.purge_ride_locations()
returns integer language plpgsql security definer set search_path=public
as $$
declare removed integer;
begin
  delete from public.ride_locations where recorded_at<=now()-interval '7 days';
  get diagnostics removed=row_count;
  return removed;
end;
$$;
revoke all on function public.purge_ride_locations() from public,anon,authenticated;
grant execute on function public.purge_ride_locations() to service_role;
select cron.schedule('teko-alpha-gps-retention','*/5 * * * *',$$select public.purge_ride_locations();$$);
