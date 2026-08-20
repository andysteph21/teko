#!/usr/bin/env bash
# Orchestration complète (doc 06 §3) : extract → conflation → graphe Valhalla
# + fond PMTiles. En prod : job nocturne + bouton admin « publier les routes
# validées » ; publication blue/green (dossier next → bascule). En dev, on
# reconstruit en place puis `docker compose restart`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
REFRESH_EXTRACT="${REFRESH_EXTRACT:-0}"

if [ "$REFRESH_EXTRACT" = "1" ] || [ ! -f "$ROOT/infra/_data/osm/gabon-latest.osm.pbf" ]; then
  "$ROOT/infra/pipeline/extract/download-extract.sh"
fi

"$ROOT/infra/pipeline/conflate/conflate.sh"
"$ROOT/infra/routing/valhalla/build-graph.sh" "$ROOT/infra/_data/osm/gabon-teko.osm.pbf"
"$ROOT/infra/tiles/planetiler/build-tiles.sh"

echo "✓ Rebuild complet. Redémarrez les services :"
echo "  docker compose -f infra/compose/docker-compose.yml restart"
