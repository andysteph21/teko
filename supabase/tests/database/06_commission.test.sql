-- ============================================================================
-- Teko — Tests pgTAP : commission paramétrable, réservée au superadmin
-- ============================================================================
begin;
select plan(7);

-- ---- Fixtures : un superadmin (S) et un admin finance (F) --------------------
insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','11110000-0000-0000-0000-000000000000','authenticated','authenticated','super@test.local'),
  ('00000000-0000-0000-0000-000000000000','22220000-0000-0000-0000-000000000000','authenticated','authenticated','finance@test.local');

do $$
begin
  perform public.set_service_mode(true);
  update public.profiles set role = 'admin', admin_role = 'superadmin'
    where id = '11110000-0000-0000-0000-000000000000';
  update public.profiles set role = 'admin', admin_role = 'finance'
    where id = '22220000-0000-0000-0000-000000000000';
  perform public.set_service_mode(false);
end $$;

-- ---- L'admin finance (pas superadmin) ne peut PAS changer la commission ------
set local "request.jwt.claims" = '{"sub":"22220000-0000-0000-0000-000000000000","role":"authenticated"}';

select is( public.is_superadmin(), false,
           'is_superadmin() = false pour un admin finance' );

select throws_ok(
  $$ select public.set_commission('percent', 20) $$,
  '42501', NULL,
  'Un admin finance ne peut pas modifier la commission (RPC)' );

-- Même via une écriture directe sur app_config : la garde bloque (clé sensible)
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22220000-0000-0000-0000-000000000000","role":"authenticated"}';
select throws_ok(
  $$ update public.app_config set value = '{"type":"percent","value":50}'::jsonb where key = 'commission' $$,
  '42501', NULL,
  'Écriture directe de la commission par un non-superadmin refusée (garde)' );
reset role;

-- ---- Le superadmin (S) PEUT changer la commission ---------------------------
set local "request.jwt.claims" = '{"sub":"11110000-0000-0000-0000-000000000000","role":"authenticated"}';

select is( public.is_superadmin(), true,
           'is_superadmin() = true pour le superadmin' );

select is(
  public.set_commission('percent', 12),
  '{"type": "percent", "value": 12}'::jsonb,
  'Le superadmin définit une commission de 12 %' );

select is(
  public.get_commission(),
  '{"type": "percent", "value": 12}'::jsonb,
  'get_commission() reflète la nouvelle valeur' );

-- ---- Bornes de validation ---------------------------------------------------
select throws_ok(
  $$ select public.set_commission('percent', 150) $$,
  '22023', NULL,
  'Un taux en pourcentage > 100 est rejeté' );

select * from finish();
rollback;
