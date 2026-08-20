#!/usr/bin/env bash
# Conflation : routes Teko VALIDÉES (Supabase road_segments) → OSM XML →
# fusion dans l'extract Gabon. Le pbf conflaté alimente Valhalla (routing)
# et, si souhaité, Planetiler (fond).
# Sortie : infra/_data/osm/gabon-teko.osm.pbf
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DATA="$ROOT/infra/_data"
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
BASE="$DATA/osm/gabon-latest.osm.pbf"
mkdir -p "$DATA/conflate"

[ -f "$BASE" ] || { echo "Extract manquant — lancez pipeline/extract/download-extract.sh" >&2; exit 1; }

# psql local si présent, sinon via le conteneur de la stack Supabase locale.
if command -v psql >/dev/null; then
  run_psql() { psql "$DB_URL" -t -A -c "$1"; }
else
  DB_CONTAINER="${DB_CONTAINER:-supabase_db_teko}"
  run_psql() { docker exec -i "$DB_CONTAINER" psql -U postgres -t -A -c "$1"; }
fi

echo "→ Export des road_segments validés…"
run_psql "
  select coalesce(json_build_object(
    'type','FeatureCollection',
    'features', json_agg(json_build_object(
      'type','Feature',
      'geometry', ST_AsGeoJSON(geom)::json,
      'properties', json_build_object('id', id, 'attributes', attributes)
    ))), '{\"type\":\"FeatureCollection\",\"features\":[]}'::json)
  from public.road_segments where status = 'validated';
" > "$DATA/conflate/teko-roads.geojson"

python3 "$ROOT/infra/pipeline/conflate/geojson_to_osm.py" \
  "$DATA/conflate/teko-roads.geojson" "$DATA/conflate/teko-roads.osm"

N_ROUTES=$(grep -c "<way " "$DATA/conflate/teko-roads.osm" || true)
if [ "$N_ROUTES" -eq 0 ]; then
  echo "Aucune route validée : le pbf conflaté = extract de base."
  cp -f "$BASE" "$DATA/osm/gabon-teko.osm.pbf"
else
  echo "→ Fusion osmium ($N_ROUTES route(s) Teko)…"
  docker run --rm -v "$DATA":/data iboates/osmium:latest \
    merge /data/osm/gabon-latest.osm.pbf /data/conflate/teko-roads.osm \
    -o /data/osm/gabon-teko.osm.pbf --overwrite
fi
ls -lh "$DATA/osm/gabon-teko.osm.pbf"
echo "✓ Extract conflaté prêt."
