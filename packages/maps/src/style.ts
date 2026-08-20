// Style MapLibre construit depuis les design tokens.
//
// Deux régimes, conformes à la contrainte de sobriété data :
//  - normal : fond de tuiles vectorielles auto-hébergées (Martin, ADR-10),
//    URL injectée par l'app (`tilesUrl`) ;
//  - éco    : AUCUNE tuile — fond uni + couches Teko uniquement (c'est le
//    rendu « carte simplifiée » des maquettes C-25). Fonctionne hors réseau.
//
// Les couches Teko (repères, itinéraire, véhicules, client) sont présentes
// dans les deux régimes, alimentées par des sources GeoJSON nommées.

import { MAP_COLORS } from "./tokens.js";

export const TEKO_SOURCES = {
  landmarks: "teko-landmarks",
  route: "teko-route",
  vehicles: "teko-vehicles",
  client: "teko-client",
} as const;

export interface MapStyleOptions {
  /** URL du style de fond (Martin/PMTiles) — ignorée en mode éco. */
  tilesUrl?: string;
  /** Mode éco : fond uni, pas de requête tuiles. */
  eco?: boolean;
  /** Glyphes (texte des repères). Défaut : glyphes du serveur de tuiles. */
  glyphsUrl?: string;
}

/** Style complet (sources GeoJSON vides + couches Teko). Objet compatible
 *  `StyleSpecification` de MapLibre, typé large pour rester sans dépendance. */
export function buildMapStyle(opts: MapStyleOptions = {}): Record<string, unknown> {
  const eco = opts.eco ?? false;
  const emptyGeoJson = { type: "geojson", data: { type: "FeatureCollection", features: [] } };

  const sources: Record<string, unknown> = {
    [TEKO_SOURCES.landmarks]: { ...emptyGeoJson },
    [TEKO_SOURCES.route]: { ...emptyGeoJson, lineMetrics: true },
    [TEKO_SOURCES.vehicles]: { ...emptyGeoJson },
    [TEKO_SOURCES.client]: { ...emptyGeoJson },
  };
  const layers: Record<string, unknown>[] = [
    { id: "teko-background", type: "background", paint: { "background-color": MAP_COLORS.background } },
  ];

  if (!eco && opts.tilesUrl) {
    sources["basemap"] = { type: "vector", url: opts.tilesUrl };
    // Fond minimal lisible sur le schéma OpenMapTiles (Planetiler → Martin) :
    // eau + voirie hiérarchisée, dans la palette des maquettes. Le style
    // « plein » viendra avec la charte carto complète.
    layers.push(
      {
        id: "basemap-water",
        type: "fill",
        source: "basemap",
        "source-layer": "water",
        paint: { "fill-color": "#CBD9EE" },
      },
      {
        id: "basemap-roads-minor",
        type: "line",
        source: "basemap",
        "source-layer": "transportation",
        filter: ["!", ["in", ["get", "class"], ["literal", ["primary", "secondary", "trunk", "motorway"]]]],
        paint: { "line-color": MAP_COLORS.road, "line-width": 1.5 },
      },
      {
        id: "basemap-roads-major",
        type: "line",
        source: "basemap",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "trunk", "motorway"]]],
        layout: { "line-cap": "round" },
        paint: { "line-color": "#FFE3B3", "line-width": 4 },
      },
    );
  }

  layers.push(
    // Itinéraire : violet, sous les marqueurs.
    {
      id: "teko-route-line",
      type: "line",
      source: TEKO_SOURCES.route,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": MAP_COLORS.routeLine, "line-width": 5, "line-opacity": 0.9 },
    },
    // Repères : épingle ambre (halo blanc) + nom.
    {
      id: "teko-landmarks-dot",
      type: "circle",
      source: TEKO_SOURCES.landmarks,
      paint: {
        "circle-color": MAP_COLORS.markerLandmark,
        "circle-radius": 7,
        "circle-stroke-color": MAP_COLORS.halo,
        "circle-stroke-width": 2,
      },
    },
    // Nom des repères — seulement si des glyphes sont disponibles : MapLibre
    // refuse toute couche texte sans `glyphs` (donc pas d'étiquettes en éco
    // pur hors-ligne ; l'app affiche alors le nom dans sa fiche repère).
    ...(opts.glyphsUrl
      ? [
          {
            id: "teko-landmarks-label",
            type: "symbol",
            source: TEKO_SOURCES.landmarks,
            layout: {
              "text-field": ["get", "name"],
              "text-size": 12,
              "text-offset": [0, 1.1],
              "text-anchor": "top",
            },
            paint: {
              "text-color": "#854F0B",
              "text-halo-color": MAP_COLORS.halo,
              "text-halo-width": 1.2,
            },
          },
        ]
      : []),
    // Véhicules : teal, orientés par le cap.
    {
      id: "teko-vehicles-dot",
      type: "circle",
      source: TEKO_SOURCES.vehicles,
      paint: {
        "circle-color": MAP_COLORS.markerDriver,
        "circle-radius": 8,
        "circle-stroke-color": MAP_COLORS.halo,
        "circle-stroke-width": 2,
      },
    },
    // Client : point magenta cerclé de blanc, toujours au-dessus.
    {
      id: "teko-client-dot",
      type: "circle",
      source: TEKO_SOURCES.client,
      paint: {
        "circle-color": MAP_COLORS.markerClient,
        "circle-radius": 8,
        "circle-stroke-color": MAP_COLORS.halo,
        "circle-stroke-width": 3,
      },
    },
  );

  return {
    version: 8,
    name: eco ? "Teko éco" : "Teko",
    ...(opts.glyphsUrl ? { glyphs: opts.glyphsUrl } : {}),
    sources,
    layers,
  };
}
