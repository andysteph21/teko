-- ============================================================================
-- Teko — Seed (données de référence pour dev/staging)
-- Exécuté par `supabase db reset`. Valeurs d'EXEMPLE (commission, tarifs) :
-- à ajuster une fois la tarification arrêtée. Tout reste paramétrable en base.
-- ============================================================================

-- Commission d'exemple : 15 % (paramétrable via app_config)
update public.app_config set value = '{"type":"percent","value":15}'::jsonb where key = 'commission';
update public.app_config set value = '0'::jsonb                                where key = 'payout_threshold';  -- versement quotidien sans seuil (réponse client n° 3)
update public.app_config set value = '{"fixed":300,"percent":20,"no_show":1000,"no_answer":1000,"wait_min":5}'::jsonb where key = 'cancellation_fee';
update public.app_config set value = '{"min_passes":10,"min_distinct_drivers":5,"window_days":21}'::jsonb where key = 'road_detect_thresholds';  -- réponse client n° 12

-- Zone de lancement : Libreville (polygone approximatif)
insert into public.zones (name, geom, is_active, coverage_status)
select 'Libreville',
       extensions.ST_Multi(extensions.ST_GeomFromText(
         'POLYGON((9.40 0.30, 9.55 0.30, 9.55 0.55, 9.40 0.55, 9.40 0.30))', 4326)),
       true, 'ready'
where not exists (select 1 from public.zones where name = 'Libreville');

-- Barème d'exemple par catégorie (XAF) — règles globales (zone_id null)
insert into public.pricing_rules (category, zone_id, base_fare, per_km, per_min, min_fare)
select * from (values
  ('eco'::public.vehicle_category,         null::uuid, 500::numeric, 250::numeric, 25::numeric, 1000::numeric),
  ('moto'::public.vehicle_category,        null::uuid, 300::numeric, 150::numeric, 15::numeric, 600::numeric),
  ('confort'::public.vehicle_category,     null::uuid, 1000::numeric, 400::numeric, 40::numeric, 2000::numeric),
  ('covoiturage'::public.vehicle_category, null::uuid, 400::numeric, 150::numeric, 15::numeric, 800::numeric)
) as v(category, zone_id, base_fare, per_km, per_min, min_fare)
where not exists (select 1 from public.pricing_rules);

-- Quelques points de repère validés (Libreville) pour l'adressage/guidage
insert into public.landmarks (name, aliases, category, geom, status, salience)
select * from (values
  ('Rond-point de la Démocratie', array['Rond-point démocratie'], 'roundabout'::public.landmark_category,
     extensions.ST_SetSRID(extensions.ST_MakePoint(9.4540, 0.3920),4326), 'validated'::public.geo_status, 10::numeric),
  ('Marché de Mont-Bouët', array['Mont Bouet','Marché Mont-Bouët'], 'market'::public.landmark_category,
     extensions.ST_SetSRID(extensions.ST_MakePoint(9.4570, 0.3990),4326), 'validated'::public.geo_status, 9::numeric),
  ('Station Total Glass', array['Total Glass'], 'fuel_station'::public.landmark_category,
     extensions.ST_SetSRID(extensions.ST_MakePoint(9.4490, 0.4080),4326), 'validated'::public.geo_status, 7::numeric)
) as v(name, aliases, category, geom, status, salience)
where not exists (select 1 from public.landmarks);

-- Webhook push local (dev) : l'Edge Function notify-push via Kong (réseau
-- docker interne). En CI/dev sans besoin de push, le meilleur-effort ignore
-- les échecs. Prod/staging : URL réelle + secret via la console (A-07).
update public.app_config set value = to_jsonb('http://supabase_kong_teko:8000/functions/v1/notify-push'::text) where key = 'push_webhook_url';
