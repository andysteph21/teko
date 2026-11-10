-- Correctif ciblé pour le VPS de l'essai. Exécuter après sauvegarde de public.landmarks.
-- Les deux repères OSM proviennent de l'extrait Gabon utilisé par le banc.
-- Marché Mont-Bouët : https://www.openstreetmap.org/node/14082131401
-- Station de Glass : https://www.openstreetmap.org/node/6462048253

begin;

update public.landmarks
set geom = extensions.ST_SetSRID(extensions.ST_MakePoint(9.4519135, 0.4012404), 4326),
    source = 'osm'
where name = 'Marché de Mont-Bouët'
  and source = 'admin'
  and status = 'validated'
  and extensions.ST_X(geom) = 9.4570
  and extensions.ST_Y(geom) = 0.3990;

-- Les positions de démo restent disponibles pour examen par Ops.
update public.landmarks
set status = 'draft'
where source = 'admin'
  and status = 'validated'
  and (
    (name = 'Rond-point de la Démocratie'
      and extensions.ST_X(geom) = 9.4540 and extensions.ST_Y(geom) = 0.3920)
    or (name = 'Station Total Glass'
      and extensions.ST_X(geom) = 9.4490 and extensions.ST_Y(geom) = 0.4080)
  );

insert into public.landmarks (name, aliases, category, geom, source, status, salience)
select 'Station-service de Glass', array['OILIBYA Glass', 'Station Glass'], 'fuel_station',
       extensions.ST_SetSRID(extensions.ST_MakePoint(9.4548753, 0.3766404), 4326),
       'osm', 'validated', 7
where not exists (
  select 1 from public.landmarks where name = 'Station-service de Glass'
);

commit;
