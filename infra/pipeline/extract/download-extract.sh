#!/usr/bin/env bash
# Télécharge (ou rafraîchit) l'extract OSM du Gabon depuis Geofabrik.
# Sortie : infra/_data/osm/gabon-latest.osm.pbf
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DATA="$ROOT/infra/_data/osm"
mkdir -p "$DATA"

URL="https://download.geofabrik.de/africa/gabon-latest.osm.pbf"
OUT="$DATA/gabon-latest.osm.pbf"

echo "→ Téléchargement de l'extract Gabon (Geofabrik)…"
curl -fL --retry 3 -o "$OUT.tmp" "$URL"
mv "$OUT.tmp" "$OUT"
ls -lh "$OUT"
echo "✓ Extract prêt : $OUT"
