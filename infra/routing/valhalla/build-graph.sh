#!/usr/bin/env bash
# Graphe de routing Valhalla depuis l'extract Gabon (éventuellement conflaté
# avec les routes Teko — voir pipeline/conflate). Image docker-valhalla :
# le conteneur construit les tuiles au premier démarrage puis sert l'API.
# Ici on ne fait QUE le build (conteneur éphémère) ; le service tourne via
# infra/compose/docker-compose.yml.
# Sortie : infra/_data/valhalla/ (custom_files + valhalla_tiles)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DATA="$ROOT/infra/_data/valhalla"
OSM_SRC="${1:-$ROOT/infra/_data/osm/gabon-latest.osm.pbf}"
mkdir -p "$DATA/custom_files"

[ -f "$OSM_SRC" ] || { echo "Extract manquant : $OSM_SRC" >&2; exit 1; }
cp -f "$OSM_SRC" "$DATA/custom_files/gabon.osm.pbf"

echo "→ Build du graphe Valhalla (une passe éphémère)…"
docker run --rm \
  -v "$DATA/custom_files":/custom_files \
  -e serve_tiles=False -e force_rebuild=True -e use_tiles_ignore_pbf=False \
  -e build_elevation=False -e build_admins=False -e build_time_zones=False \
  -e use_default_speeds_config=False -e traffic_name= \
  ghcr.io/valhalla/valhalla-scripted:latest

ls -lh "$DATA/custom_files" | head
echo "✓ Graphe Valhalla prêt (infra/_data/valhalla/custom_files)."
