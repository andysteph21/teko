-- ============================================================================
-- Teko — Tests pgTAP : structure, business_day, immuabilité du ledger, gardes
-- Exécuté par `supabase test db` (transaction + rollback automatique).
-- ============================================================================
begin;
select plan(15);

-- ---- Présence des tables clés -------------------------------------------------
select has_table('public','profiles',         'table profiles');
select has_table('public','drivers',          'table drivers');
select has_table('public','rides',            'table rides');
select has_table('public','payments',         'table payments');
select has_table('public','ledger',           'table ledger');
select has_table('public','landmarks',        'table landmarks');
select has_table('public','road_segments',    'table road_segments');
select has_table('public','daily_statements', 'table daily_statements');

-- ---- Colonnes structurantes ---------------------------------------------------
select has_column('public','ledger','amount_signed',     'ledger.amount_signed');
select has_column('public','rides','origin_landmark_id', 'rides.origin_landmark_id (adressage par repère)');

-- ---- business_day : coupure 04:00 Africa/Libreville --------------------------
select is( public.business_day('2026-06-05T03:59:00+01:00'::timestamptz), '2026-06-04'::date,
           '03:59 (WAT) est rattaché au jour précédent' );
select is( public.business_day('2026-06-05T04:00:00+01:00'::timestamptz), '2026-06-05'::date,
           '04:00 (WAT) est rattaché au jour même' );

-- ---- Fixtures pour l'immuabilité du ledger -----------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000',
        '11111111-1111-1111-1111-111111111111','authenticated','authenticated','driver1@test.local');
-- profile créé automatiquement par trigger handle_new_user
insert into public.drivers (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.ledger (driver_id, business_day, kind, amount_signed, balance_after)
values ('11111111-1111-1111-1111-111111111111', public.business_day(), 'commission_due', -400, -400);

-- ---- Le ledger est append-only ----------------------------------------------
-- throws_ok(sql, errcode, errmsg, description) : on vérifie le SQLSTATE
-- (P0001 = raise exception) sans imposer le texte exact (errmsg = NULL).
select throws_ok(
  $$ update public.ledger set amount_signed = 0 where driver_id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001', NULL, 'UPDATE interdit sur le ledger (append-only)' );
select throws_ok(
  $$ delete from public.ledger where driver_id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001', NULL, 'DELETE interdit sur le ledger (append-only)' );

-- ---- Garde anti-escalade de rôle (non-admin) --------------------------------
select throws_ok(
  $$ update public.profiles set role = 'driver' where id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001', NULL, 'Changement de rôle interdit hors admin' );

select * from finish();
rollback;
