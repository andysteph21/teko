-- ============================================================================
-- Teko — Tests pgTAP : Row Level Security (isolation par utilisateur/rôle)
-- On crée les fixtures en superutilisateur, puis on bascule sur le rôle
-- `authenticated` avec un JWT (request.jwt.claims.sub) pour vérifier la RLS.
-- ============================================================================
begin;
select plan(6);

-- ---- Fixtures (superutilisateur, hors RLS) ----------------------------------
insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','clientA@test.local'),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','authenticated','authenticated','clientB@test.local'),
  ('00000000-0000-0000-0000-000000000000','dddddddd-dddd-dddd-dddd-dddddddddddd','authenticated','authenticated','driver@test.local');

-- profils créés par trigger ; on ajoute la fiche chauffeur pour D
insert into public.drivers (id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd');

-- une course appartenant au client A
insert into public.rides (client_id, category, origin_geom, dest_geom)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','eco',
        extensions.ST_SetSRID(extensions.ST_MakePoint(9.4500, 0.3900),4326),
        extensions.ST_SetSRID(extensions.ST_MakePoint(9.4600, 0.4000),4326));

-- un repère validé (visible) et un repère proposé (non visible) — noms dédiés au test
-- pour rester robuste aux repères insérés par le seed.
insert into public.landmarks (name, category, geom, status) values
  ('ZZ Test repère validé', 'fuel_station', extensions.ST_SetSRID(extensions.ST_MakePoint(9.451,0.391),4326), 'validated'),
  ('ZZ Test repère proposé','other',        extensions.ST_SetSRID(extensions.ST_MakePoint(9.452,0.392),4326), 'proposed');

-- ---- Bascule sur le client A -------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is( (select count(*) from public.rides)::int, 1,
           'Le client A voit sa propre course' );
select is( (select count(*) from public.landmarks where name like 'ZZ Test repère%')::int, 1,
           'Seuls les repères validés sont visibles (le proposé est masqué)' );
select is( (select count(*) from public.ledger)::int, 0,
           'Un client ne voit aucune écriture du ledger' );
-- 42501 = violation de politique RLS (WITH CHECK)
select throws_ok(
  $$ insert into public.rides (client_id, category, origin_geom, dest_geom)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','eco',
             extensions.ST_SetSRID(extensions.ST_MakePoint(9.45,0.39),4326),
             extensions.ST_SetSRID(extensions.ST_MakePoint(9.46,0.40),4326)) $$,
  '42501', NULL, 'A ne peut pas créer une course au nom de B (RLS WITH CHECK)' );

-- ---- Bascule sur le client B -------------------------------------------------
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is( (select count(*) from public.rides)::int, 0,
           'Le client B ne voit pas la course de A' );

-- ---- Bascule sur le chauffeur D ---------------------------------------------
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select throws_ok(
  $$ update public.drivers set is_active = true where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'P0001', NULL, 'Un chauffeur ne peut pas s''auto-activer (garde champs sensibles)' );

reset role;
select * from finish();
rollback;
