# Licence des données cartographiques Teko

**Décision du 20 août 2026** (règle la question share-alike ODbL soulevée dans
`docs/architecture/08` / backlog OSM-01·02).

## Couches servies par Martin

| Source | Contenu | Licence |
|---|---|---|
| `gabon` (PMTiles) | Fond de carte dérivé d'OpenStreetMap (extract Geofabrik) | **ODbL 1.0** — © les contributeurs OpenStreetMap |
| `teko_roads` | Routes collaboratives Teko validées (tracés GPS chauffeurs, revue admin) | **ODbL 1.0** — publiée ouvertement |
| `landmarks` | Points de repère validés (nom, catégorie, position) | Base **collective** distincte, combinée au rendu uniquement |
| `zones` | Zones de service Teko | Donnée opérationnelle Teko |

## Pourquoi `teko_roads` est ODbL

Le graphe de routing (`gabon-teko.osm.pbf`) fusionne les routes Teko dans les
données OSM : c'est une **base dérivée** au sens de l'ODbL, et son usage public
(itinéraires servis aux utilisateurs) déclenche le partage à l'identique. La
couche `teko_roads` est donc publiée sous ODbL : elle est déjà servie
publiquement par Martin (`/teko_roads/{z}/{x}/{y}`), et un export complet
(GeoJSON) est fourni sur demande — voir `pipeline/conflate/conflate.sh`, qui
produit exactement cet export.

Restent **internes** (bases séparées, jamais fusionnées à OSM) : la saillance,
les compteurs d'usage, les alias et photos des repères, et toute donnée liée
aux courses.

## Attribution

Toute carte affichée publiquement porte « © les contributeurs OpenStreetMap »
(intégrée au style `@teko/maps`, contrôle compact — OSM-02, réglé).

La stratégie de **contribution amont** (upload des routes vers OSM, dédupe par
`osm_way_id`) reste reportée post-MVP — backlog OSM-01.
