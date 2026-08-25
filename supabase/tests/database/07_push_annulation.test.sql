-- ============================================================================
-- Teko — Tests pgTAP : livraison push (publication + webhook) et
-- estimation des frais d'annulation (C-21).
-- ============================================================================
begin;
select plan(8);

-- Publication Realtime : notifications visible au premier plan.
select ok(
  exists(select 1 from pg_publication_tables
          where pubname = 'supabase_realtime' and tablename = 'notifications'),
  'notifications est dans la publication supabase_realtime'
);

-- Webhook : trigger posé, no-op silencieux quand l''URL est absente.
select ok(
  exists(select 1 from pg_trigger
          where tgname = 'notifications_push_webhook' and not tgisinternal),
  'trigger notifications_push_webhook présent'
);
update public.app_config set value = 'null'::jsonb where key = 'push_webhook_url';
select lives_ok(
  $$
    insert into auth.users (instance_id, id, aud, role, email) values
      ('00000000-0000-0000-0000-000000000000','cccc3333-cccc-3333-cccc-333333333333','authenticated','authenticated','push@test.local');
    insert into public.notifications (user_id, type, payload)
    values ('cccc3333-cccc-3333-cccc-333333333333', 'test_push', '{}'::jsonb);
  $$,
  'insertion de notification sans URL push : aucun échec'
);

-- Frais d''annulation estimés --------------------------------------------------
update public.app_config
   set value = '{"fixed":300,"percent":20,"no_show":1000,"no_answer":1000,"wait_min":5}'::jsonb
 where key = 'cancellation_fee';

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','dddd4444-dddd-4444-dddd-444444444444','authenticated','authenticated','cli@test.local'),
  ('00000000-0000-0000-0000-000000000000','eeee5555-eeee-5555-eeee-555555555555','authenticated','authenticated','drv@test.local');
insert into public.drivers (id, kyc_status) values ('eeee5555-eeee-5555-eeee-555555555555','validated');

insert into public.rides (id, client_id, category, status, origin_geom, dest_geom, price_est, pin_code)
values ('11111111-2222-3333-4444-555555555555', 'dddd4444-dddd-4444-dddd-444444444444', 'eco', 'requested',
        extensions.ST_SetSRID(extensions.ST_MakePoint(9.45,0.40),4326),
        extensions.ST_SetSRID(extensions.ST_MakePoint(9.47,0.39),4326),
        1000, '1234');

-- Le client de la course interroge.
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddd4444-dddd-4444-dddd-444444444444","role":"authenticated"}';

select is(
  public.estimate_cancellation_fee('11111111-2222-3333-4444-555555555555'),
  0::numeric,
  'avant attribution : annulation gratuite (0)'
);

reset role;
update public.rides
   set status = 'accepted', driver_id = 'eeee5555-eeee-5555-eeee-555555555555', accepted_at = now()
 where id = '11111111-2222-3333-4444-555555555555';

set local role authenticated;
set local request.jwt.claims to '{"sub":"dddd4444-dddd-4444-dddd-444444444444","role":"authenticated"}';

-- price_est 1000 : max(300, 20 %×1000=200) = 300 (le fixe l''emporte).
select is(
  public.estimate_cancellation_fee('11111111-2222-3333-4444-555555555555'),
  300::numeric,
  'petite course : le montant fixe l''emporte'
);

reset role;
update public.rides set price_est = 5000 where id = '11111111-2222-3333-4444-555555555555';
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddd4444-dddd-4444-dddd-444444444444","role":"authenticated"}';

-- price_est 5000 : max(300, 1000) = 1000 (le pourcentage l''emporte).
select is(
  public.estimate_cancellation_fee('11111111-2222-3333-4444-555555555555'),
  1000::numeric,
  'grosse course : le pourcentage l''emporte'
);

-- Un tiers n''a pas accès.
set local request.jwt.claims to '{"sub":"cccc3333-cccc-3333-cccc-333333333333","role":"authenticated"}';
select throws_like(
  $$ select public.estimate_cancellation_fee('11111111-2222-3333-4444-555555555555') $$,
  '%participants%',
  'un tiers est refusé'
);

reset role;
select is(
  (select count(*) from pg_proc where proname = 'estimate_cancellation_fee')::int,
  1,
  'la fonction est unique'
);

select * from finish();
rollback;
