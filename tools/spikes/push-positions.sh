#!/usr/bin/env bash
# Pousse 1 position/s sur une course (au nom du chauffeur de la course) —
# alimente le spike Realtime. Usage : ./push-positions.sh <ride_id> [durée_s]
set -euo pipefail

RIDE_ID="${1:?usage: push-positions.sh <ride_id> [durée_s]}"
DURATION="${2:-60}"

for i in $(seq 1 "$DURATION"); do
  LON=$(python3 -c "print(9.4536 + $i * 0.0002)")
  LAT=$(python3 -c "print(0.4032 - $i * 0.0001)")
  docker exec supabase_db_teko psql -U postgres -d postgres -Atqc "
    insert into public.ride_locations (ride_id, driver_id, geom, recorded_at)
    select r.id, r.driver_id, st_geomfromewkt('SRID=4326;POINT($LON $LAT)'), now()
    from public.rides r where r.id = '$RIDE_ID';" > /dev/null
  echo "position $i/$DURATION envoyée ($(date +%H:%M:%S))"
  sleep 1
done
