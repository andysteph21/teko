-- ============================================================================
-- Teko — Tests pgTAP : fiche chauffeur des participants (ride_driver_card).
-- ============================================================================
begin;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','aaaa6666-aaaa-6666-aaaa-666666666666','authenticated','authenticated','c8@test.local'),
  ('00000000-0000-0000-0000-000000000000','bbbb7777-bbbb-7777-bbbb-777777777777','authenticated','authenticated','d8@test.local'),
  ('00000000-0000-0000-0000-000000000000','cccc8888-cccc-8888-cccc-888888888888','authenticated','authenticated','x8@test.local');
update public.profiles set full_name = 'Boris Mba' where id = 'bbbb7777-bbbb-7777-bbbb-777777777777';
insert into public.drivers (id, kyc_status) values ('bbbb7777-bbbb-7777-bbbb-777777777777','validated');
insert into public.vehicles (driver_id, category, plate)
values ('bbbb7777-bbbb-7777-bbbb-777777777777', 'eco', 'GA-482-LBV');

insert into public.rides (id, client_id, driver_id, category, status, origin_geom, dest_geom, price_est, pin_code, accepted_at)
values ('22222222-3333-4444-5555-666666666666', 'aaaa6666-aaaa-6666-aaaa-666666666666',
        'bbbb7777-bbbb-7777-bbbb-777777777777', 'eco', 'accepted',
        extensions.ST_SetSRID(extensions.ST_MakePoint(9.45,0.40),4326),
        extensions.ST_SetSRID(extensions.ST_MakePoint(9.47,0.39),4326),
        1200, '4729', now());

-- Une note existante pour la moyenne.
insert into public.rides (id, client_id, driver_id, category, status, origin_geom, dest_geom, price_est, pin_code)
values ('33333333-4444-5555-6666-777777777777', 'aaaa6666-aaaa-6666-aaaa-666666666666',
        'bbbb7777-bbbb-7777-bbbb-777777777777', 'eco', 'completed',
        extensions.ST_SetSRID(extensions.ST_MakePoint(9.45,0.40),4326),
        extensions.ST_SetSRID(extensions.ST_MakePoint(9.47,0.39),4326),
        1000, '0000');
insert into public.ratings (ride_id, from_user, to_user, stars)
values ('33333333-4444-5555-6666-777777777777', 'aaaa6666-aaaa-6666-aaaa-666666666666',
        'bbbb7777-bbbb-7777-bbbb-777777777777', 5);

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaa6666-aaaa-6666-aaaa-666666666666","role":"authenticated"}';

select is(
  public.ride_driver_card('22222222-3333-4444-5555-666666666666') ->> 'first_name',
  'Boris',
  'le passager voit le prénom du chauffeur'
);
select is(
  public.ride_driver_card('22222222-3333-4444-5555-666666666666') ->> 'plate',
  'GA-482-LBV',
  'la plaque du véhicule est exposée'
);
select is(
  (public.ride_driver_card('22222222-3333-4444-5555-666666666666') ->> 'rating')::numeric,
  5.0,
  'la note moyenne est exposée'
);
select ok(
  public.ride_driver_card('22222222-3333-4444-5555-666666666666') ->> 'phone' is null,
  'jamais de téléphone dans la fiche'
);

set local request.jwt.claims to '{"sub":"cccc8888-cccc-8888-cccc-888888888888","role":"authenticated"}';
select throws_like(
  $$ select public.ride_driver_card('22222222-3333-4444-5555-666666666666') $$,
  '%participants%',
  'un tiers est refusé'
);

select * from finish();
rollback;
