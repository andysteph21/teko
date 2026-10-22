-- ============================================================================
-- Teko — Tests pgTAP : tarification + cycle de vie d'une course
-- On reste en superutilisateur (les RPC sont SECURITY DEFINER) et on fixe
-- l'identité via request.jwt.claims (auth.uid()).
-- ============================================================================
begin;
select plan(9);

update public.app_config set value = '{"type":"percent","value":15}'::jsonb where key = 'commission';

-- Client C et chauffeur D (validé, actif, catégorie eco)
insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','cccc0000-cccc-0000-cccc-000000000000','authenticated','authenticated','cli@test.local'),
  ('00000000-0000-0000-0000-000000000000','dddd0000-dddd-0000-dddd-000000000000','authenticated','authenticated','drv@test.local');
update auth.users set phone='24107000101',phone_confirmed_at=now() where id='cccc0000-cccc-0000-cccc-000000000000';
update auth.users set phone='24107000102',phone_confirmed_at=now() where id='dddd0000-dddd-0000-dddd-000000000000';
insert into public.alpha_invites(phone,role) values('24107000101','client'),('24107000102','driver');
insert into public.drivers (id, kyc_status, categories)
  values ('dddd0000-dddd-0000-dddd-000000000000','validated', array['eco']::public.vehicle_category[]);
do $$
begin
  perform public.set_service_mode(true);
  update public.drivers set is_active = true where id = 'dddd0000-dddd-0000-dddd-000000000000';
  perform public.set_service_mode(false);
end $$;

-- 1) Tarification (eco seed : base 500 + 250/km + 25/min, 5 km / 10 min = 2000)
select is( public.estimate_price('eco', 5000, 600, null), 2000::numeric, 'estimate_price eco 5km/10min = 2000' );

-- Dispatch par offres (0017) : le chauffeur doit être en ligne (heartbeat)
-- pour recevoir l'offre que accept_ride acceptera.
do $$
begin
  perform set_config('request.jwt.claims',
    '{"sub":"dddd0000-dddd-0000-dddd-000000000000","role":"authenticated"}', true);
  perform public.driver_heartbeat(extensions.ST_SetSRID(extensions.ST_MakePoint(9.451, 0.391),4326));
end $$;

-- 2-3) Commande par le client C
set local "request.jwt.claims" = '{"sub":"cccc0000-cccc-0000-cccc-000000000000","role":"authenticated"}';
create temp table _r as
  select * from public.request_ride(
    'eco',
    extensions.ST_SetSRID(extensions.ST_MakePoint(9.45, 0.39),4326),
    extensions.ST_SetSRID(extensions.ST_MakePoint(9.47, 0.41),4326),
    5000, 600);

select is( (select status::text from _r), 'requested', 'Course créée au statut requested' );
create temp table _pin as select public.ride_pin((select id from _r)) as code;
select is( (select length(code) from _pin), 4, 'Code PIN privé à 4 chiffres lisible par le passager' );

-- 4-8) Déroulé par le chauffeur D
set local "request.jwt.claims" = '{"sub":"dddd0000-dddd-0000-dddd-000000000000","role":"authenticated"}';

select is( (public.accept_ride((select id from _r))).status::text, 'accepted', 'Chauffeur accepte -> accepted' );
select is( (public.mark_arrived((select id from _r))).status::text, 'arrived', 'Chauffeur arrivé -> arrived' );

select is(public.start_ride_checked((select id from _r), '00000')->>'error',
          'pin_incorrect', 'PIN incorrect rejeté et échec conservé');
select is(public.start_ride_checked((select id from _r), (select code from _pin))->'ride'->>'status',
          'started', 'PIN correct -> started');
select is( (public.complete_ride((select id from _r))).status::text,
           'completed', 'Course terminée -> completed' );

-- 9) Effet financier : course cash 2000 @15% -> commission 300 -> solde -300
select is( public.driver_balance('dddd0000-dddd-0000-dddd-000000000000'),
           -300::numeric, 'Course cash -> solde chauffeur -300' );

select * from finish();
rollback;
