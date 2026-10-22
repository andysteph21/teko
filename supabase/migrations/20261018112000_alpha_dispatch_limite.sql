-- Une recherche reste ouverte au plus trois minutes, même si aucun
-- chauffeur n'est encore en ligne. Les nouveaux éligibles sont retentés.
create or replace function public.offer_next_driver(p_ride uuid)
returns public.ride_offers language plpgsql security definer set search_path=public
as $$
declare r public.rides; driver uuid; result public.ride_offers;
  timeout_s integer; ttl_s integer; deadline timestamptz;
begin
  select * into r from public.rides where id=p_ride for update;
  if not found or r.status<>'requested' or r.driver_id is not null then return null; end if;
  deadline:=r.created_at+make_interval(secs=>coalesce(
    (select value::text::integer from public.app_config where key='dispatch_timeout_s'),180));
  if now()>=deadline then
    update public.rides set status='failed',cancel_reason='no_driver_found',completed_at=now() where id=r.id;
    update public.ride_offers set status='cancelled',responded_at=now() where ride_id=r.id and status='pending';
    insert into public.ride_events(ride_id,type,meta) values(r.id,'dispatch_timeout','{}');
    perform public.enqueue_notification(r.client_id,'no_driver_found',jsonb_build_object('ride_id',r.id));
    return null;
  end if;
  if exists(select 1 from public.ride_offers where ride_id=r.id and status='pending') then return null; end if;
  timeout_s:=coalesce((select value::text::integer from public.app_config where key='offer_timeout_s'),12);
  ttl_s:=coalesce((select value::text::integer from public.app_config where key='presence_ttl_s'),300);
  select d.id into driver from public.drivers d join public.driver_presence p on p.driver_id=d.id
    where d.is_active and d.kyc_status='validated' and r.category=any(d.categories)
      and p.updated_at>now()-make_interval(secs=>ttl_s)
      and not exists(select 1 from public.ride_offers o where o.ride_id=r.id and o.driver_id=d.id)
      and not exists(select 1 from public.rides active where active.driver_id=d.id
        and active.status in ('accepted','enroute','arrived','started'))
    order by extensions.st_distance(p.geom::extensions.geography,r.origin_geom::extensions.geography)
    limit 1;
  if driver is null then return null; end if;
  insert into public.ride_offers(ride_id,driver_id,rank,expires_at)
    values(r.id,driver,coalesce((select max(rank) from public.ride_offers where ride_id=r.id),0)+1,
      least(deadline,now()+make_interval(secs=>timeout_s))) returning * into result;
  insert into public.ride_events(ride_id,type,meta)
    values(r.id,'offer_sent',jsonb_build_object('driver_id',driver,'rank',result.rank));
  perform public.enqueue_notification(driver,'ride_offer',
    jsonb_build_object('offer_id',result.id,'ride_id',r.id,'expires_at',result.expires_at));
  return result;
end;
$$;

create function public.retry_alpha_dispatch()
returns integer language plpgsql security definer set search_path=public
as $$
declare r record; count integer:=0;
begin
  for r in select id from public.rides where status='requested' and scheduled_at is null
    for update skip locked
  loop
    perform public.offer_next_driver(r.id);
    count:=count+1;
  end loop;
  return count;
end;
$$;
revoke all on function public.retry_alpha_dispatch() from public,anon,authenticated;
grant execute on function public.retry_alpha_dispatch() to service_role;
select cron.schedule('teko-alpha-retry-dispatch','5 seconds',$$select public.retry_alpha_dispatch();$$);

-- Garde lors de l'acceptation, y compris si le job n'a pas encore tourné.
create function private.guard_alpha_assignment()
returns trigger language plpgsql set search_path=public
as $$
begin
  if old.status='requested' and new.status='accepted' and now()>=old.created_at+
    make_interval(secs=>coalesce((select value::text::integer from public.app_config
      where key='dispatch_timeout_s'),180)) then
    raise exception 'Recherche expirée' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_alpha_assignment() from public,anon,authenticated;
create trigger rides_guard_alpha_assignment before update on public.rides
  for each row execute function private.guard_alpha_assignment();
notify pgrst,'reload schema';
