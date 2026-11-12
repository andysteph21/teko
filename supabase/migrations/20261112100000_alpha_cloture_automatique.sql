-- Retour terrain du 11 novembre 2026 : une course est restée « en cours »
-- 29 heures, bloquant le passager et le chauffeur, GPS du chauffeur actif.
-- Décision du porteur du 12 novembre : une course démarrée est terminée
-- automatiquement après un délai raisonnable. Délai = le plus long de
-- `ride_auto_complete_h` (3 h) et de quatre fois la durée estimée, compté
-- depuis le départ. La clôture suit le circuit normal (prix annoncé,
-- commission, reçu, notification) au nom du chauffeur assigné.
insert into public.app_config(key, value, description) values
  ('ride_auto_complete_h','3','Clôture automatique d''une course démarrée : heures minimales depuis le départ, décision du 12 novembre 2026')
on conflict (key) do nothing;

create function public.auto_complete_stale_rides()
returns integer language plpgsql security definer set search_path = public
as $$
declare r record; hours numeric; closed integer := 0; previous text;
begin
  perform public.assert_admin_or_service();
  hours := coalesce((select (value #>> '{}')::numeric from public.app_config
    where key = 'ride_auto_complete_h'), 3);
  if hours <= 0 then return 0; end if;
  previous := current_setting('request.jwt.claims', true);
  for r in
    select id, driver_id from public.rides
     where status = 'started' and driver_id is not null and started_at is not null
       and now() >= started_at + greatest(make_interval(secs => hours * 3600),
         make_interval(secs => 4 * coalesce(duration_est_s, 0)))
     for update skip locked
  loop
    begin
      -- _complete_ride identifie le chauffeur par auth.uid() : la tâche agit
      -- en son nom, le temps de cette seule clôture.
      perform set_config('request.jwt.claims',
        jsonb_build_object('sub', r.driver_id, 'role', 'authenticated')::text, true);
      perform public._complete_ride(r.id, null);
      insert into public.ride_events(ride_id, type, meta)
        values (r.id, 'auto_completed', jsonb_build_object('after_hours', hours));
      perform public.enqueue_notification(r.driver_id, 'ride_auto_completed',
        jsonb_build_object('ride_id', r.id));
      closed := closed + 1;
    exception when others then
      insert into public.ride_events(ride_id, type, meta)
        values (r.id, 'auto_complete_failed', jsonb_build_object('error', sqlerrm));
    end;
  end loop;
  perform set_config('request.jwt.claims', coalesce(previous, ''), true);
  return closed;
end;
$$;
revoke all on function public.auto_complete_stale_rides() from public, anon, authenticated;
grant execute on function public.auto_complete_stale_rides() to service_role;
select cron.schedule('teko-alpha-auto-complete', '*/5 * * * *',
  $$select public.auto_complete_stale_rides();$$);
notify pgrst, 'reload schema';
