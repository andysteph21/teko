-- ============================================================================
-- Teko — Tests pgTAP : clôture journalière (désactivation + payout)
-- ============================================================================
begin;
select plan(7);

update public.app_config set value = '{"type":"percent","value":15}'::jsonb where key = 'commission';
update public.app_config set value = '500'::jsonb where key = 'payout_threshold';

-- Deux chauffeurs actifs et KYC validés
insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','aaaa1111-aaaa-1111-aaaa-111111111111','authenticated','authenticated','dA@test.local'),
  ('00000000-0000-0000-0000-000000000000','bbbb2222-bbbb-2222-bbbb-222222222222','authenticated','authenticated','dB@test.local');
insert into public.drivers (id, kyc_status) values
  ('aaaa1111-aaaa-1111-aaaa-111111111111','validated'),
  ('bbbb2222-bbbb-2222-bbbb-222222222222','validated');

do $$
begin
  perform public.set_service_mode(true);
  update public.drivers set is_active = true
   where id in ('aaaa1111-aaaa-1111-aaaa-111111111111','bbbb2222-bbbb-2222-bbbb-222222222222');
  perform public.set_service_mode(false);
  -- A : dette (solde négatif) ; B : créance (solde positif)
  perform public.post_ledger('aaaa1111-aaaa-1111-aaaa-111111111111','commission_due', -1000);
  perform public.post_ledger('bbbb2222-bbbb-2222-bbbb-222222222222','mobile_credit',  2000);
end $$;

-- Clôture du jour courant : traite AU MOINS nos 2 chauffeurs (la base
-- locale peut contenir des chauffeurs laissés par la suite e2e — en CI
-- fraîche, c'est exactement 2).
select cmp_ok( public.daily_close(), '>=', 2, 'La clôture traite au moins nos 2 chauffeurs' );

-- A : désactivé pour solde négatif
select is( (select is_active from public.drivers where id='aaaa1111-aaaa-1111-aaaa-111111111111'),
           false, 'Chauffeur A désactivé (solde négatif)' );
select is( (select deactivated_reason from public.drivers where id='aaaa1111-aaaa-1111-aaaa-111111111111'),
           'overdue_balance', 'Motif de désactivation = overdue_balance' );
select is( (select status::text from public.daily_statements
             where driver_id='aaaa1111-aaaa-1111-aaaa-111111111111'),
           'overdue', 'Relevé A = overdue' );
select is( (select closing from public.daily_statements
             where driver_id='aaaa1111-aaaa-1111-aaaa-111111111111'),
           -1000::numeric, 'Solde de clôture A = -1000' );

-- B : versement manuel en attente, jamais payé avant preuve + validation.
select is( (select count(*) from public.payout_requests
             where driver_id='bbbb2222-bbbb-2222-bbbb-222222222222'
               and status='pending' and amount=2000)::int,
           1, 'Un versement manuel de 2000 est préparé pour B' );
select is( (select status::text from public.daily_statements
             where driver_id='bbbb2222-bbbb-2222-bbbb-222222222222'),
           'open', 'Relevé B reste ouvert avant validation du versement' );

select * from finish();
rollback;
