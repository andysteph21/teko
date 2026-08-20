-- ============================================================================
-- Teko — Tests pgTAP : repères (adressage/guidage) + notifications
-- ============================================================================
begin;
select plan(6);

-- Repères de test (noms dédiés, robustes au seed)
insert into public.landmarks (name, category, geom, status, salience) values
  ('ZZ Near LM', 'market'::public.landmark_category,
     extensions.ST_SetSRID(extensions.ST_MakePoint(9.5005, 0.4502),4326), 'validated', 10),
  ('ZZ Far LM',  'market'::public.landmark_category,
     extensions.ST_SetSRID(extensions.ST_MakePoint(9.4000, 0.3000),4326), 'validated', 5);

-- Point de test proche de "ZZ Near LM"
-- 1) suggestion de point de rendez-vous
select is(
  (select name from public.landmarks
     where id = public.suggest_meeting_landmark(extensions.ST_SetSRID(extensions.ST_MakePoint(9.5006,0.4503),4326))),
  'ZZ Near LM', 'suggest_meeting_landmark renvoie le repère proche' );

-- 2) géocodage inverse par repère
select is(
  public.reverse_geocode_landmark(extensions.ST_SetSRID(extensions.ST_MakePoint(9.5006,0.4503),4326)),
  'près de ZZ Near LM', 'reverse_geocode_landmark renvoie « près de <repère> »' );

-- 3) classement par saillance/distance
select is(
  (select name from public.nearest_landmarks(
      extensions.ST_SetSRID(extensions.ST_MakePoint(9.5006,0.4503),4326), 5000, 5) limit 1),
  'ZZ Near LM', 'nearest_landmarks classe le repère le plus pertinent en premier' );

-- Utilisateurs : proposeur (client) + admin
insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','eeee0000-eeee-0000-eeee-000000000000','authenticated','authenticated','prop@test.local'),
  ('00000000-0000-0000-0000-000000000000','ffff0000-ffff-0000-ffff-000000000000','authenticated','authenticated','adm@test.local');
do $$
begin
  perform public.set_service_mode(true);
  update public.profiles set role = 'admin', admin_role = 'carto' where id = 'ffff0000-ffff-0000-ffff-000000000000';
  perform public.set_service_mode(false);
end $$;

-- 4) proposition d'un repère par le client
set local "request.jwt.claims" = '{"sub":"eeee0000-eeee-0000-eeee-000000000000","role":"authenticated"}';
create temp table _p as
  select * from public.propose_landmark(
    'ZZ Proposé', 'church'::public.landmark_category,
    extensions.ST_SetSRID(extensions.ST_MakePoint(9.5010,0.4510),4326));
select is( (select status::text from _p), 'proposed', 'propose_landmark crée une proposition (proposed)' );

-- 5) validation par l'admin -> repère validé
-- L'appel (effet de bord) est isolé dans une instruction dédiée pour éviter
-- tout court-circuit d'un AND dans l'assertion.
set local "request.jwt.claims" = '{"sub":"ffff0000-ffff-0000-ffff-000000000000","role":"authenticated"}';
create temp table _v as
  select public.validate_landmark_proposal((select id from _p), true) as landmark_id;
select ok(
  (select landmark_id from _v) is not null
  and exists (select 1 from public.landmarks where name = 'ZZ Proposé' and status = 'validated'),
  'validate_landmark_proposal (admin) publie le repère' );

-- 6) notification
create temp table _n as
  select * from public.enqueue_notification('eeee0000-eeee-0000-eeee-000000000000', 'test', '{}'::jsonb);
select is(
  (select count(*) from public.notifications
     where user_id = 'eeee0000-eeee-0000-eeee-000000000000' and type = 'test')::int,
  1, 'enqueue_notification crée une notification pour l''utilisateur' );

select * from finish();
rollback;
