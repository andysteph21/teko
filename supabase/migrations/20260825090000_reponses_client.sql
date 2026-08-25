-- ============================================================================
-- Teko — 0021 : Réponses client du 25 août 2026 (document « Décisions »)
-- Trois valeurs de configuration changent, deux clés apparaissent. Tout le
-- reste des 26 réponses confirme l'existant (voir docs/plan/04-suivi-client).
-- ============================================================================

-- Q3 — Versement quotidien automatique à la clôture, SANS seuil au lancement.
update public.app_config set value = '0'::jsonb
 where key = 'payout_threshold';

-- Q12 — Route inconnue proposée à validation : ≥ 10 passages par
-- ≥ 5 chauffeurs différents sur 3 semaines (le défaut était 3 chauffeurs
-- sur 14 jours).
update public.app_config
   set value = '{"min_passes":10,"min_distinct_drivers":5,"window_days":21}'::jsonb
 where key = 'road_detect_thresholds';

-- Q15 — Deux repères à moins de 50 m sont signalés comme doublons
-- (alerte console carto).
insert into public.app_config (key, value, description) values
  ('landmark_duplicate_m', '50',
   'Distance (m) sous laquelle deux repères sont signalés comme doublons potentiels (réponse client n° 15).'),
-- Q14 — Traces GPS anonymisées à la collecte, conservées 12 mois
-- (sous réserve de la validation juridique, question n° 16).
  ('gps_trace_retention_months', '12',
   'Durée de conservation des traces GPS anonymisées (réponse client n° 14, réserve juridique n° 16).')
on conflict (key) do nothing;
