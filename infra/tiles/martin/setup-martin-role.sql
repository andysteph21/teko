-- Rôle lecture seule pour Martin (tuiles dynamiques PostGIS).
-- Martin n'a besoin QUE de lire les couches publiques validées : lui donner
-- un rôle dédié, sans RLS bypass générique ni accès aux tables sensibles.
-- Usage : psql "$DB_URL" -f setup-martin-role.sql
-- (idempotent ; mot de passe de dev — à surcharger en prod via ALTER ROLE)

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'martin_tiles') then
    create role martin_tiles login password 'martin_tiles_dev';
  end if;
end $$;

grant usage on schema public, extensions to martin_tiles;
grant select on public.landmarks, public.road_segments, public.zones to martin_tiles;

-- Martin interroge en direct : la RLS s'applique aussi à lui. Politiques de
-- lecture dédiées, limitées au contenu validé/actif (idempotent).
drop policy if exists "tiles_landmarks_validated" on public.landmarks;
create policy "tiles_landmarks_validated" on public.landmarks
  for select to martin_tiles using ( status = 'validated' );
drop policy if exists "tiles_roads_validated" on public.road_segments;
create policy "tiles_roads_validated" on public.road_segments
  for select to martin_tiles using ( status = 'validated' );
drop policy if exists "tiles_zones_active" on public.zones;
create policy "tiles_zones_active" on public.zones
  for select to martin_tiles using ( is_active );

-- PostGIS vit dans le schéma `extensions` chez Supabase : indispensable au
-- search_path pour que Martin trouve postgis_lib_version()/ST_AsMVT.
alter role martin_tiles set search_path = public, extensions;
