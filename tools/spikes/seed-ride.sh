#!/usr/bin/env bash
# Course de test pour le spike Realtime : client = numéro de test …0001,
# chauffeur = …0002, statut started (les participants reçoivent les positions
# via la RLS). Écrit l'id de la course sur stdout.
set -euo pipefail

docker exec supabase_db_teko psql -U postgres -d postgres -Atqc "
set local teko.service = 'on';
insert into public.drivers (id, categories)
select id, array['eco']::vehicle_category[] from auth.users where phone = '24107000002'
on conflict (id) do nothing;" > /dev/null

docker exec supabase_db_teko psql -U postgres -d postgres -Atc "
with c as (select id from auth.users where phone = '24107000001'),
     d as (select id from auth.users where phone = '24107000002')
insert into public.rides
  (client_id, driver_id, category, status, origin_geom, dest_geom,
   distance_est_m, duration_est_s, price_est, payment_method, pin_code, accepted_at, started_at)
select c.id, d.id, 'eco', 'started',
       st_geomfromewkt('SRID=4326;POINT(9.4536 0.4032)'),
       st_geomfromewkt('SRID=4326;POINT(9.4677 0.3925)'),
       3190, 318, 1430, 'cash', '4729', now(), now()
from c, d
returning id;"
