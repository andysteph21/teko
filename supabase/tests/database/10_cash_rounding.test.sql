begin;
select plan(10);

update public.pricing_rules set base_fare=1203,per_km=0,per_min=0,min_fare=1000
  where category='eco' and zone_id is null;
select is(public.estimate_price('eco',0,0),1200::numeric,'Prix arrondi au multiple de 25');
update public.pricing_rules set base_fare=1212.50 where category='eco' and zone_id is null;
select is(public.estimate_price('eco',0,0),1225::numeric,'Prix au demi-pas arrondi vers le haut');
update public.pricing_rules set base_fare=0,min_fare=1011 where category='eco' and zone_id is null;
select is(public.estimate_price('eco',0,0),1025::numeric,'Le pas ne descend pas sous le prix minimum');

insert into auth.users(instance_id,id,aud,role,email) values
  ('00000000-0000-0000-0000-000000000000','fc000000-0000-0000-0000-000000000001','authenticated','authenticated','cash-client@test.local'),
  ('00000000-0000-0000-0000-000000000000','fc000000-0000-0000-0000-000000000002','authenticated','authenticated','cash-driver@test.local');
insert into public.drivers(id) values('fc000000-0000-0000-0000-000000000002');
update public.app_config set value='{"fixed":300,"percent":20,"no_show":312.50,"no_answer":337.50,"wait_min":5,"driver_share_percent":70}'
  where key='cancellation_fee';
create temp table cash_rides as
  with inserted as (
    insert into public.rides(client_id,driver_id,category,status,origin_geom,dest_geom,price_est,payment_method,arrived_at)
    select 'fc000000-0000-0000-0000-000000000001','fc000000-0000-0000-0000-000000000002','eco',state,
      extensions.st_setsrid(extensions.st_makepoint(9.45,0.4),4326),
      extensions.st_setsrid(extensions.st_makepoint(9.47,0.41),4326),1600,'cash',now()-interval '6 minutes'
      from unnest(array['accepted','arrived','arrived']::public.ride_status[]) state
    returning id,status
  ) select id,status,row_number() over(partition by status order by id) as num from inserted;

set local "request.jwt.claims"='{"sub":"fc000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is(public.estimate_cancellation_fee((select id from cash_rides where status='accepted')),325::numeric,'Frais annoncés : 320 devient 325');
do $$ begin perform public.cancel_ride((select id from cash_rides where status='accepted')); end $$;
select is((select amount from public.cancellation_claims where ride_id=(select id from cash_rides where status='accepted')),325::numeric,'Créance identique aux frais annoncés');
select is((select driver_share from public.cancellation_claims where ride_id=(select id from cash_rides where status='accepted')),225::numeric,'Part chauffeur de 227,50 arrondie à 225');

set local "request.jwt.claims"='{"sub":"fc000000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$ begin perform public.cancel_ride((select id from cash_rides where status='arrived' and num=1),null,'no_show'); end $$;
select is((select amount from public.cancellation_claims where ride_id=(select id from cash_rides where status='arrived' and num=1)),325::numeric,'Non-présentation au demi-pas : 325');
do $$ begin perform public.cancel_ride((select id from cash_rides where status='arrived' and num=2),null,'no_answer'); end $$;
select is((select amount from public.cancellation_claims where ride_id=(select id from cash_rides where status='arrived' and num=2)),350::numeric,'Sans réponse au demi-pas : 350');
select is(public.cancellation_driver_share(300,'{"driver_share_percent":70}'),200::numeric,'Part de 210 arrondie à 200');
select ok(not coalesce(has_function_privilege('authenticated',to_regprocedure('private.round_cash_amount(numeric)'),'execute'),true),'Aucune RPC usager ajoutée pour le calcul interne');
select * from finish();
rollback;
