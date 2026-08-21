-- ============================================================================
-- Teko — 0020 : Provenance des géodonnées (conformité ODbL, backlog OSM-01/02)
--
-- `road_segments.source` dit QUI a créé le segment (admin/chauffeur/…) ;
-- `provenance` dit DE QUOI il dérive au sens des licences :
--   'teko'  — tracé original Teko (GPS chauffeurs, saisie admin) ;
--   'osm'   — copié/dérivé d'OpenStreetMap (ODbL, partage à l'identique) ;
--   'mixte' — géométrie retouchée à partir d'OSM.
-- Permet de toujours distinguer ce qui est publiable/à contribuer de ce qui
-- relève de l'ODbL. Tous les segments existants sont des tracés Teko.
-- ============================================================================

create type public.geo_provenance as enum ('teko','osm','mixte');

alter table public.road_segments
  add column if not exists provenance public.geo_provenance not null default 'teko';

comment on column public.road_segments.provenance is
  'Origine licence : teko (original, publié ODbL par choix), osm/mixte (dérivé OSM, ODbL obligatoire). Distinct de `source` (acteur créateur).';

-- Même distinction pour les repères (créés par la communauté Teko aujourd'hui,
-- mais un import OSM de POI reste possible demain).
alter table public.landmarks
  add column if not exists provenance public.geo_provenance not null default 'teko';

comment on column public.landmarks.provenance is
  'Origine licence du repère. Les attributs comportementaux (salience, usage_count) restent internes quelle que soit la provenance.';
