# @teko/maps

Abstraction carte du monorepo : **style MapLibre construit depuis les design
tokens**, couches du langage carte des maquettes, **adaptateur de données
Supabase**, et **mode éco** (aucune tuile — fond uni + couches Teko, cf. C-25).

## Architecture

| Module | Rôle | Dépendances |
|---|---|---|
| `src/tokens.ts` | Couleurs carte (source : `docs/design/design-tokens.json`) | aucune |
| `src/geo.ts` | EWKT/EWKB/GeoJSON, arrondis de sobriété, distances | aucune |
| `src/geojson.ts` | Lignes Supabase → FeatureCollection | aucune |
| `src/style.ts` | Style MapLibre (normal = tuiles Martin ; éco = fond uni) | aucune |
| `src/adapter.ts` | `TekoMapData` : RPC repères, heartbeat, positions Realtime | `@supabase/supabase-js` |
| `src/web/controller.ts` | `TekoMapController` (MapLibre GL JS) — **import `@teko/maps/web`** | `maplibre-gl` |

Les apps React Native consomment le cœur (`@teko/maps`) et rendent avec
MapLibre Native ; seule l'entrée `/web` importe `maplibre-gl` (admin + démo).

## Langage carte (verrouillé par les tests)

- point client **magenta** `#8C238A` · repères **ambre** `#F5A623`
- itinéraire **violet** `#5A1A80` · véhicules **teal** `#00BFA5`
- destination jamais exposée au chauffeur avant acceptation (l'adaptateur ne
  la fournit pas — voir `offer_details` côté backend).

## Formats géométrie (vérifiés contre la stack locale)

PostgREST **et** Realtime sérialisent les colonnes PostGIS en **objet
GeoJSON** ; l'EWKB hexadécimal existe aussi (exports). `toLonLat()` accepte
les deux — utilisez-le pour toute géométrie venant de Supabase.

## Tests

```bash
pnpm test:unit        # purs, sans stack
supabase start && eval "$(supabase status -o env | sed 's/^/export /')"
pnpm test             # + intégration : repères seed, heartbeat éco, Realtime
```

L'intégration vérifie notamment le **flux temps réel complet** : le client
d'une course reçoit via `postgres_changes` (RLS participants) la position
poussée par le chauffeur. CI : `.github/workflows/maps-ci.yml`.

## Démo visuelle

```bash
pnpm demo:build && xdg-open demo/index.html
```

Style éco autonome (aucun réseau requis) avec données Libreville fictives —
c'est la page utilisée pour la vérification visuelle du langage carte.
