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

-- 2-3) Commande par le client C
set local "request.jwt.claims" = '{"sub":"cccc0000-cccc-0000-cccc-000000000000","role":"authenticated"}';
create temp table _r as
  select * from public.request_ride(
    'eco',
    extensions.ST_SetSRID(extensions.ST_MakePoint(9.45, 0.39),4326),
    extensions.ST_SetSRID(extensions.ST_MakePoint(9.47, 0.41),4326),
    5000, 600);

select is( (select status::text from _r), 'requested', 'Course créée au statut requested' );
select is( (select length(pin_code) from _r), 4, 'Code PIN à 4 chiffres généré' );

-- 4-8) Déroulé par le chauffeur D
set local "request.jwt.claims" = '{"sub":"dddd0000-dddd-0000-dddd-000000000000","role":"authenticated"}';

select is( (public.accept_ride((select id from _r))).status::text, 'accepted', 'Chauffeur accepte -> accepted' );
select is( (public.mark_arrived((select id from _r))).status::text, 'arrived', 'Chauffeur arrivé -> arrived' );

select throws_ok(
  $$ select public.start_ride((select id from _r), '00000') $$,
  'P0001', NULL, 'PIN incorrect rejeté' );

select is( (public.start_ride((select id from _r), (select pin_code from _r))).status::text,
           'started', 'PIN correct -> started' );
select is( (public.complete_ride((select id from _r))).status::text,
           'completed', 'Course terminée -> completed' );

-- 9) Effet financier : course cash 2000 @15% -> commission 300 -> solde -300
select is( public.driver_balance('dddd0000-dddd-0000-dddd-000000000000'),
           -300::numeric, 'Course cash -> solde chauffeur -300' );

select * from finish();
rollback;
