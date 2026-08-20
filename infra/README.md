# Infrastructure cartographique Teko

Implémente `docs/architecture/06-infra-cartographie.md` : **self-hosted lean**
dès le jour 1 — Planetiler (fond PMTiles), **Martin** (fond + couches PostGIS
en direct), **Valhalla** (routing/map-matching), pipeline de conflation des
routes Teko validées.

## Principe clé

- **Affichage = instantané** : `landmarks`, `road_segments`, `zones` validés
  sont servis en tuiles vectorielles **directement depuis la base Supabase**
  par Martin. Une validation admin est visible immédiatement.
- **Routing = par rebuild** : une nouvelle route devient *empruntable* après
  reconstruction du graphe Valhalla (`pipeline/rebuild/rebuild.sh`).

## Démarrage local (dev)

```bash
# 1. La stack Supabase locale doit tourner (migrations + seed)
supabase start

# 2. Extract OSM Gabon + fond de carte PMTiles
infra/pipeline/extract/download-extract.sh
infra/tiles/planetiler/build-tiles.sh

# 3. Graphe de routing Valhalla
infra/routing/valhalla/build-graph.sh

# 4. Rôle lecture seule pour Martin (une fois par base)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f infra/tiles/martin/setup-martin-role.sql

# 5. Services
docker compose -f infra/compose/docker-compose.yml up -d

# Vérifications
curl -s http://127.0.0.1:3333/catalog | jq .          # sources Martin
curl -s http://127.0.0.1:8002/status | jq .           # Valhalla
```

## Arborescence

```
infra/
├─ tiles/
│  ├─ planetiler/     # build du fond gabon.pmtiles (Planetiler, docker)
│  └─ martin/         # config Martin : PMTiles + tables PostGIS + rôle SQL
├─ routing/
│  └─ valhalla/       # build du graphe (docker-valhalla) + costing
├─ pipeline/
│  ├─ extract/        # extract Gabon (Geofabrik)
│  ├─ conflate/       # road_segments validés → OSM XML → merge osmium
│  └─ rebuild/        # orchestration extract → conflate → graphe + tuiles
├─ offline/           # (à venir) paquets hors-ligne par zone
├─ compose/           # docker-compose dev (Martin + Valhalla)
└─ deploy/            # (à venir) IaC Paris eu-west-3 (ADR-11)
```

Les artefacts générés vivent dans `infra/_data/` (ignoré par git).

## Production (rappel ADR-10/11)

VM modeste Paris (OVH/Scaleway), co-localisée avec Supabase `eu-west-3` ;
PMTiles derrière CDN ; rebuild nocturne + bouton admin « publier les routes
validées » ; bascule blue/green par échange de dossier `current → next`.
Repli d'urgence : URL de style managée (MapTiler) par simple changement de
configuration MapLibre.
