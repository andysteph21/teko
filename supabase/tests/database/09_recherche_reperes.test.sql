-- ============================================================================
-- Teko — Tests pgTAP : recherche de repères (accents, alias, validés seuls).
-- ============================================================================
begin;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','ffff9999-ffff-9999-ffff-999999999999','authenticated','authenticated','s9@test.local');

insert into public.landmarks (name, aliases, category, geom, status, salience) values
  ('Marché Test-Éÿé', array['Marche Sans Accent'], 'market',
     extensions.ST_SetSRID(extensions.ST_MakePoint(9.31, 0.31),4326), 'validated', 5),
  ('Pharmacie Proposée', array[]::text[], 'pharmacy',
     extensions.ST_SetSRID(extensions.ST_MakePoint(9.32, 0.32),4326), 'proposed', 9);

set local role authenticated;
set local request.jwt.claims to '{"sub":"ffff9999-ffff-9999-ffff-999999999999","role":"authenticated"}';

select is(
  (select count(*) from public.search_landmarks('marche test'))::int, 1,
  'sans accents ni casse, « Marché » est trouvé'
);
select is(
  (select name from public.search_landmarks('eye') limit 1),
  'Marché Test-Éÿé',
  'les accents du nom sont neutralisés (Éÿé ← eye)'
);
select is(
  (select count(*) from public.search_landmarks('sans accent'))::int, 1,
  'les alias sont cherchés aussi'
);
select is(
  (select count(*) from public.search_landmarks('proposée'))::int, 0,
  'les repères non validés sont invisibles'
);
select is(
  (select count(*) from public.search_landmarks('p'))::int, 0,
  'requête trop courte → aucun résultat'
);

select * from finish();
rollback;
