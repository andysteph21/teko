-- ============================================================================
-- Teko — Un véhicule par chauffeur et par catégorie (constat lot 4) :
-- re-soumettre l'étape D-06 (retour arrière du dossier) créait un doublon.
-- L'unicité permet un vrai upsert côté app (remplacement de la plaque).
-- ============================================================================

-- Doublons éventuels d'avant la contrainte : on garde le plus récent.
delete from public.vehicles v
 using public.vehicles newer
 where newer.driver_id = v.driver_id
   and newer.category = v.category
   and newer.created_at > v.created_at;

create unique index vehicles_driver_category_uidx
  on public.vehicles (driver_id, category);
