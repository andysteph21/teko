-- Réglages du banc après le jour 2 (10 novembre 2026). Exécuter sur le VPS
-- après la migration 20261111090000 et une sauvegarde de la base.
-- Décisions tracées dans docs/product/05-questions-ouvertes.md (11 novembre 2026).

begin;

-- 1. Prise en charge partout au Gabon : le devis exige un départ dans une zone
--    active. L'emprise couvre le pays ; Libreville reste une zone distincte.
insert into public.zones (name, geom, is_active, coverage_status)
select 'Gabon',
       extensions.ST_Multi(extensions.ST_GeomFromText(
         'POLYGON((8.60 -4.00, 14.60 -4.00, 14.60 2.40, 8.60 2.40, 8.60 -4.00))', 4326)),
       true, 'ready'
where not exists (select 1 from public.zones where name = 'Gabon');

-- 2. Les comptes chauffeurs du banc n'acceptaient que Éco : toute commande
--    Confort échouait sans offre. Les chauffeurs de test reçoivent les deux
--    catégories voiture ; Moto reste réservé à un véhicule moto.
update public.drivers
set categories = array['eco','confort']::public.vehicle_category[]
where kyc_status = 'validated'
  and categories = array['eco']::public.vehicle_category[];

commit;
