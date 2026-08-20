#!/usr/bin/env bash
# Fond de carte : extract Gabon → gabon.pmtiles (schéma OpenMapTiles).
# Utilise l'image docker officielle Planetiler — pas de Java à installer.
# Sortie : infra/_data/tiles/gabon.pmtiles
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OSM="$ROOT/infra/_data/osm/gabon-latest.osm.pbf"
OUT_DIR="$ROOT/infra/_data/tiles"
mkdir -p "$OUT_DIR"

[ -f "$OSM" ] || { echo "Extract manquant — lancez pipeline/extract/download-extract.sh" >&2; exit 1; }

echo "→ Planetiler : $OSM → gabon.pmtiles"
docker run --rm \
  -v "$ROOT/infra/_data":/data \
  ghcr.io/onthegomap/planetiler:latest \
  --osm-path=/data/osm/gabon-latest.osm.pbf \
  --output=/data/tiles/gabon.pmtiles \
  --download --fetch-wikidata=false \
  --force

ls -lh "$OUT_DIR/gabon.pmtiles"
echo "✓ Fond PMTiles prêt."
