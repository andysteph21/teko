-- Retour terrain du 10 novembre 2026 (jour 2) : avec un seul chauffeur en
-- ligne, une offre manquée (12 s, app en arrière-plan) laissait la recherche
-- sans aucune nouvelle proposition jusqu'à l'échec à 3 minutes.
--  1. Une offre EXPIRÉE (silence) est reproposée au même chauffeur quand plus
--     aucun chauffeur jamais sollicité n'est éligible. Un refus explicite
--     reste définitif pour la course.
--  2. Le délai de réponse passe de 12 s à 30 s pour l'alpha (décision du
--     11 novembre 2026, docs/product/05-questions-ouvertes.md).
update public.app_config set value='30'::jsonb where key='offer_timeout_s';

create or replace function public.offer_next_driver(p_ride uuid)
returns public.ride_offers language plpgsql security definer set search_path=public
as $$
declare r public.rides; driver uuid; previous uuid; result public.ride_offers;
  timeout_s integer; ttl_s integer; deadline timestamptz; next_rank integer;
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
  timeout_s:=coalesce((select value::text::integer from public.app_config where key='offer_timeout_s'),30);
  ttl_s:=coalesce((select value::text::integer from public.app_config where key='presence_ttl_s'),300);
  -- Jamais sollicités d'abord (au plus proche), puis offres expirées, la plus ancienne en tête.
  select d.id, o.id into driver, previous
    from public.drivers d join public.driver_presence p on p.driver_id=d.id
    left join public.ride_offers o on o.ride_id=r.id and o.driver_id=d.id
    where d.is_active and d.kyc_status='validated' and r.category=any(d.categories)
      and p.updated_at>now()-make_interval(secs=>ttl_s)
      and (o.id is null or o.status='expired')
      and not exists(select 1 from public.rides active where active.driver_id=d.id
        and active.status in ('accepted','enroute','arrived','started'))
    order by (o.id is not null), o.offered_at,
      extensions.st_distance(p.geom::extensions.geography,r.origin_geom::extensions.geography)
    limit 1;
  if driver is null then return null; end if;
  next_rank:=coalesce((select max(rank) from public.ride_offers where ride_id=r.id),0)+1;
  if previous is null then
    insert into public.ride_offers(ride_id,driver_id,rank,expires_at)
      values(r.id,driver,next_rank,least(deadline,now()+make_interval(secs=>timeout_s)))
      returning * into result;
  else
    update public.ride_offers set status='pending',rank=next_rank,offered_at=now(),
      responded_at=null,expires_at=least(deadline,now()+make_interval(secs=>timeout_s))
      where id=previous returning * into result;
  end if;
  insert into public.ride_events(ride_id,type,meta)
    values(r.id,'offer_sent',jsonb_build_object('driver_id',driver,'rank',result.rank,
      'retry',previous is not null));
  perform public.enqueue_notification(driver,'ride_offer',
    jsonb_build_object('offer_id',result.id,'ride_id',r.id,'expires_at',result.expires_at));
  return result;
end;
$$;
notify pgrst,'reload schema';
