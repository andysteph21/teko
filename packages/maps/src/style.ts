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
  /** Mode éco : fond uni, pas de requête tuiles (ni glyphes → pas de texte). */
  eco?: boolean;
  /** Glyphes. Défaut : dérivés de l'origine de `tilesUrl` (Martin sert
   *  /font/{fontstack}/{range}). */
  glyphsUrl?: string;
  /** Piles de polices servies par Martin (défaut : DejaVu du compose dev ;
   *  en prod, pointer les Noto déposées dans infra/_data/fonts). */
  fonts?: { regular: string; bold: string };
  /** Densité des étiquettes (padding de collision + seuils de zoom des
   *  équipements) : "faible" pour les petits écrans/mode discret,
   *  "dense" pour l'admin desktop. Défaut "normale". */
  labelDensity?: "faible" | "normale" | "dense";
}

// Équipements « notables » (classes OpenMapTiles), en deux paliers :
// visibles tôt (structurants pour se repérer) vs détail de quartier.
const POI_MAJEURS = [
  "hospital", "university", "stadium", "townhall", "police", "fire_station",
  "courthouse", "museum", "monument", "harbor", "ferry_terminal",
];
const POI_QUARTIER = [
  "school", "college", "place_of_worship", "grocery", "shop", "mall",
  "bank", "fuel", "post", "pharmacy", "clinic", "doctors",
];

/** Style complet (sources GeoJSON vides + couches Teko). Objet compatible
 *  `StyleSpecification` de MapLibre, typé large pour rester sans dépendance. */
export function buildMapStyle(opts: MapStyleOptions = {}): Record<string, unknown> {
  const eco = opts.eco ?? false;
  const emptyGeoJson = { type: "geojson", data: { type: "FeatureCollection", features: [] } };

  // Glyphes : explicites, sinon dérivés du serveur de tuiles (Martin).
  const glyphsUrl =
    opts.glyphsUrl ??
    (!eco && opts.tilesUrl
      ? `${new URL(opts.tilesUrl).origin}/font/{fontstack}/{range}`
      : undefined);
  const fonts = opts.fonts ?? { regular: "DejaVu Sans Book", bold: "DejaVu Sans Bold" };
  const densite = opts.labelDensity ?? "normale";
  // Le padding de collision est LE réglage de densité de MapLibre : plus il
  // est grand, plus les étiquettes s'espacent. Le décalage de zoom retarde
  // (ou avance) l'apparition des équipements.
  const padding = { faible: 26, normale: 14, dense: 6 }[densite];
  const zShift = { faible: 1, normale: 0, dense: -0.7 }[densite];
  const halo = { "text-halo-color": MAP_COLORS.halo, "text-halo-width": 1.7 };

  const sources: Record<string, unknown> = {
    [TEKO_SOURCES.landmarks]: { ...emptyGeoJson },
    [TEKO_SOURCES.route]: { ...emptyGeoJson, lineMetrics: true },
    [TEKO_SOURCES.vehicles]: { ...emptyGeoJson },
    [TEKO_SOURCES.client]: { ...emptyGeoJson },
  };
  const layers: Record<string, unknown>[] = [
    // Normal : fond un cran plus profond que le token pour que la voirie
    // blanche liserée ressorte ; éco : fond uni des maquettes (token).
    {
      id: "teko-background",
      type: "background",
      paint: { "background-color": eco ? MAP_COLORS.background : "#EDECF5" },
    },
  ];

  if (!eco && opts.tilesUrl) {
    // Attribution ODbL obligatoire dès que des données OSM sont affichées
    // (backlog OSM-02) — MapLibre la remonte dans le contrôle d'attribution.
    sources["basemap"] = {
      type: "vector",
      url: opts.tilesUrl,
      attribution: "© les contributeurs OpenStreetMap",
    };

    // ------------------------------------------------------------------
    // Fond cartographique — lisibilité d'abord :
    //  · fond légèrement assombri pour que la voirie blanche ressorte ;
    //  · chaque route a un LISERÉ (casing) plus foncé — c'est lui qui rend
    //    les petites rues lisibles, pas la couleur de remplissage ;
    //  · largeurs en interpolation EXPONENTIELLE : les rues s'épaississent
    //    naturellement au zoom (une ruelle reste fine à z12, large à z17) ;
    //  · touches de contexte (végétation, bâtiments, eau) en teintes douces
    //    de la palette violette — jamais plus saturées que les données Teko.
    // ------------------------------------------------------------------
    const MAJEURES = ["motorway", "trunk", "primary", "secondary"];
    const w = (stops: [number, number][]) => [
      "interpolate",
      ["exponential", 1.6],
      ["zoom"],
      ...stops.flat(),
    ];

    layers.push(
      // Contexte : végétation, parcs, zones bâties — teintes très douces.
      {
        id: "basemap-landcover",
        type: "fill",
        source: "basemap",
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland", "wetland"]]],
        paint: { "fill-color": "#DEEAD9", "fill-opacity": 0.7 },
      },
      {
        id: "basemap-park",
        type: "fill",
        source: "basemap",
        "source-layer": "park",
        paint: { "fill-color": "#D8E8D3", "fill-opacity": 0.8 },
      },
      {
        id: "basemap-landuse",
        type: "fill",
        source: "basemap",
        "source-layer": "landuse",
        filter: ["in", ["get", "class"], ["literal", ["residential", "commercial", "industrial"]]],
        paint: { "fill-color": "#E9E7F0", "fill-opacity": 0.5 },
      },
      // Eau : plans + cours, un ton plus soutenu pour un vrai contraste.
      {
        id: "basemap-water",
        type: "fill",
        source: "basemap",
        "source-layer": "water",
        paint: { "fill-color": "#BFD3ED" },
      },
      {
        id: "basemap-waterway",
        type: "line",
        source: "basemap",
        "source-layer": "waterway",
        paint: { "line-color": "#BFD3ED", "line-width": w([[10, 0.5], [14, 1.5], [18, 4]]) },
      },
      // Pistes d'aéroport : structurantes pour se repérer.
      {
        id: "basemap-aeroway",
        type: "line",
        source: "basemap",
        "source-layer": "aeroway",
        paint: { "line-color": "#DDDAE8", "line-width": w([[10, 1], [14, 6], [16, 14]]) },
      },
      // Bâtiments au zoom quartier : donnent la texture urbaine.
      {
        id: "basemap-buildings",
        type: "fill",
        source: "basemap",
        "source-layer": "building",
        minzoom: 14.5,
        paint: {
          "fill-color": "#E3E0EC",
          "fill-outline-color": "#D4D0E2",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.5, 0.9],
        },
      },
      // Sentiers/pistes piétonnes : pointillés discrets, zoom élevé.
      {
        id: "basemap-paths",
        type: "line",
        source: "basemap",
        "source-layer": "transportation",
        minzoom: 15,
        filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
        paint: {
          "line-color": "#C2BDD4",
          "line-width": w([[15, 1], [18, 3.5]]),
          "line-dasharray": [2, 1.6],
        },
      },
      // ---- Voirie : liseré d'abord, remplissage ensuite (jointures nettes).
      {
        id: "basemap-roads-minor-casing",
        type: "line",
        source: "basemap",
        "source-layer": "transportation",
        minzoom: 11,
        filter: [
          "!",
          ["in", ["get", "class"], ["literal", [...MAJEURES, "path", "track"]]],
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#CDC9DD", "line-width": w([[11, 1], [14, 3.2], [16, 7], [18, 17]]) },
      },
      {
        id: "basemap-roads-major-casing",
        type: "line",
        source: "basemap",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", MAJEURES]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#E3B76F", "line-width": w([[9, 2], [12, 4.5], [14, 7], [16, 11], [18, 26]]) },
      },
      {
        id: "basemap-roads-minor",
        type: "line",
        source: "basemap",
        "source-layer": "transportation",
        minzoom: 11,
        filter: [
          "!",
          ["in", ["get", "class"], ["literal", [...MAJEURES, "path", "track"]]],
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": MAP_COLORS.road, "line-width": w([[11, 0.5], [14, 2], [16, 5.2], [18, 14]]) },
      },
      {
        id: "basemap-roads-major",
        type: "line",
        source: "basemap",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", MAJEURES]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#FFE0A8", "line-width": w([[9, 1.2], [12, 3], [14, 5], [16, 8.5], [18, 22]]) },
      },
    );

    // ------------------------------------------------------------------
    // Étiquettes du fond — hiérarchie par zoom, densité par collision.
    // MapLibre masque automatiquement toute étiquette qui en chevauche une
    // autre : `symbol-sort-key` (rang OSM croissant) décide qui gagne, et
    // `text-padding` règle l'espacement — c'est le curseur `labelDensity`.
    // ------------------------------------------------------------------
    if (glyphsUrl) {
      layers.push(
        // Localités : villes/communes tôt, quartiers et villages ensuite.
        {
          id: "labels-localites-majeures",
          type: "symbol",
          source: "basemap",
          "source-layer": "place",
          minzoom: 8,
          filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
          layout: {
            "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]],
            "text-font": [fonts.bold],
            "text-size": ["interpolate", ["linear"], ["zoom"], 9, 13, 14, 18],
            "text-padding": padding,
            "symbol-sort-key": ["get", "rank"],
          },
          paint: { "text-color": "#3D3D52", ...halo },
        },
        {
          id: "labels-quartiers",
          type: "symbol",
          source: "basemap",
          "source-layer": "place",
          minzoom: 12,
          filter: ["in", ["get", "class"], ["literal", ["suburb", "quarter", "neighbourhood", "village", "hamlet"]]],
          layout: {
            "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]],
            "text-font": [fonts.regular],
            "text-size": ["interpolate", ["linear"], ["zoom"], 12, 11.5, 16, 14],
            "text-transform": "uppercase",
            "text-letter-spacing": 0.08,
            "text-padding": padding,
            "symbol-sort-key": ["get", "rank"],
          },
          paint: { "text-color": "#71718A", ...halo },
        },
        // Aéroport : structurant, visible dès l'échelle ville.
        {
          id: "labels-aeroports",
          type: "symbol",
          source: "basemap",
          "source-layer": "aerodrome_label",
          minzoom: 10.5,
          layout: {
            "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]],
            "text-font": [fonts.bold],
            "text-size": 12,
            "text-padding": padding,
          },
          paint: { "text-color": "#4E608A", ...halo },
        },
        // Équipements notables, palier 1 : hôpitaux, universités, stades…
        {
          id: "labels-equipements-majeurs",
          type: "symbol",
          source: "basemap",
          "source-layer": "poi",
          minzoom: 13.5 + zShift,
          filter: [
            "all",
            ["has", "name"],
            ["in", ["get", "class"], ["literal", POI_MAJEURS]],
            // class=hospital couvre aussi cabinets/cliniques (subclass) :
            // seuls les vrais hôpitaux sont structurants à cette échelle.
            ["!", ["in", ["get", "subclass"], ["literal", ["clinic", "doctors", "dentist"]]]],
          ],
          layout: {
            "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]],
            "text-font": [fonts.regular],
            "text-size": 11.5,
            "text-max-width": 8,
            "text-padding": padding,
            "symbol-sort-key": ["get", "rank"],
          },
          paint: { "text-color": "#4A4A60", ...halo },
        },
        // Équipements de quartier, palier 2 : écoles, stations, pharmacies…
        {
          id: "labels-equipements-quartier",
          type: "symbol",
          source: "basemap",
          "source-layer": "poi",
          minzoom: 15 + zShift,
          filter: [
            "all",
            ["has", "name"],
            [
              "any",
              ["in", ["get", "class"], ["literal", POI_QUARTIER]],
              ["==", ["get", "subclass"], "marketplace"],
              ["in", ["get", "subclass"], ["literal", ["clinic", "doctors", "dentist"]]],
            ],
          ],
          layout: {
            "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]],
            "text-font": [fonts.regular],
            "text-size": 11,
            "text-max-width": 8,
            "text-padding": padding,
            "symbol-sort-key": ["get", "rank"],
          },
          paint: { "text-color": "#6B6B80", ...halo },
        },
        // Noms de rues le long des tracés : grands axes d'abord.
        {
          id: "labels-rues-majeures",
          type: "symbol",
          source: "basemap",
          "source-layer": "transportation_name",
          minzoom: 12.5,
          filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
          layout: {
            "symbol-placement": "line",
            "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]],
            "text-font": [fonts.regular],
            "text-size": 11.5,
            "text-padding": padding,
          },
          paint: { "text-color": "#5F5F76", ...halo },
        },
        {
          id: "labels-rues",
          type: "symbol",
          source: "basemap",
          "source-layer": "transportation_name",
          minzoom: 15 + zShift,
          filter: ["!", ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]]],
          layout: {
            "symbol-placement": "line",
            "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]],
            "text-font": [fonts.regular],
            "text-size": 10.5,
            "text-padding": padding,
          },
          paint: { "text-color": "#6E6E85", ...halo },
        },
      );
    }
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
    // Nom des repères Teko — priorité à la saillance (le repère le plus connu
    // gagne la place en cas de collision). Sans glyphes (éco hors-ligne),
    // MapLibre refuse toute couche texte : l'app montre alors le nom en fiche.
    ...(glyphsUrl
      ? [
          {
            id: "teko-landmarks-label",
            type: "symbol",
            source: TEKO_SOURCES.landmarks,
            minzoom: 12,
            layout: {
              "text-field": ["get", "name"],
              "text-font": [fonts.bold],
              "text-size": 12,
              "text-offset": [0, 1.1],
              "text-anchor": "top",
              "text-max-width": 9,
              "text-padding": padding,
              "symbol-sort-key": ["*", -1, ["to-number", ["get", "salience"], 0]],
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
    ...(glyphsUrl ? { glyphs: glyphsUrl } : {}),
    sources,
    layers,
  };
}
