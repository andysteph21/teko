-- ============================================================================
-- Teko — Tests pgTAP : moteur de solde (commission 15 %, scénario chiffré)
-- Reproduit l'exemple de docs/product/02-regles-metier.md avec commission 15 %.
-- ============================================================================
begin;
select plan(11);

-- Commission d'exemple : 15 %
update public.app_config set value = '{"type":"percent","value":15}'::jsonb where key = 'commission';

-- Chauffeur de test
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000',
        '22222222-2222-2222-2222-222222222222','authenticated','authenticated','bal@test.local');
insert into public.drivers (id) values ('22222222-2222-2222-2222-222222222222');

-- commission_amount
select is( public.commission_amount(2000), 300::numeric, '15 % de 2000 = 300' );
select is( public.commission_amount(1203), 175::numeric, '15 % de 1203 arrondi au multiple de 25 = 175' );
select is( public.commission_amount(1450), 225::numeric, '15 % de 1450 arrondi au multiple de 25 = 225' );
select is( public.commission_amount(750), 125::numeric, 'Demi-pas 112,50 arrondi vers 125' );
update public.app_config set value='{"type":"fixed","value":187.49}' where key='commission';
select is(public.commission_amount(1000),175::numeric,'Commission fixe sous le demi-pas : 175');
update public.app_config set value='{"type":"fixed","value":187.50}' where key='commission';
select is(public.commission_amount(1000),200::numeric,'Commission fixe au demi-pas : 200');
update public.app_config set value='{"type":"percent","value":15}' where key='commission';

-- Scénario : chaque post_ledger renvoie balance_after (l'effet est appliqué)
select is(
  (public.post_ledger('22222222-2222-2222-2222-222222222222','commission_due',
                      -public.commission_amount(2000))).balance_after,
  -300::numeric, 'Course cash 2000 -> solde -300' );

select is(
  (public.post_ledger('22222222-2222-2222-2222-222222222222','mobile_credit',
                      3000 - public.commission_amount(3000))).balance_after,
  2250::numeric, 'Course mobile 3000 -> solde +2250' );

select is(
  (public.post_ledger('22222222-2222-2222-2222-222222222222','commission_due',
                      -public.commission_amount(1500))).balance_after,
  2025::numeric, 'Course cash 1500 -> solde +2025' );

select is(
  (public.post_ledger('22222222-2222-2222-2222-222222222222','commission_due',
                      -public.commission_amount(5000))).balance_after,
  1275::numeric, 'Course cash 5000 -> solde +1275' );

select is( public.driver_balance('22222222-2222-2222-2222-222222222222'),
           1275::numeric, 'Solde final = 1275' );

select * from finish();
rollback;
