// Fond cartographique complet — lisibilité d'abord :
//  · fond légèrement assombri pour que la voirie blanche ressorte ;
//  · chaque route a un LISERÉ (casing) plus foncé — c'est lui qui rend
//    les petites rues lisibles, pas la couleur de remplissage ;
//  · largeurs en interpolation EXPONENTIELLE : les rues s'épaississent
//    naturellement au zoom (une ruelle reste fine à z12, large à z17) ;
//  · touches de contexte (végétation, bâtiments, eau) en teintes douces
//    de la palette violette — jamais plus saturées que les données Teko.

import { MAP_COLORS } from "../tokens.js";
import { expWidth, type Layer, ROADS_MAJEURES } from "./helpers.js";

export function fullBasemapLayers(): Layer[] {
  const MAJEURES = ROADS_MAJEURES;
  return [
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
      paint: {
        "line-color": "#BFD3ED",
        "line-width": expWidth([
          [10, 0.5],
          [14, 1.5],
          [18, 4],
        ]),
      },
    },
    // Pistes d'aéroport : structurantes pour se repérer.
    {
      id: "basemap-aeroway",
      type: "line",
      source: "basemap",
      "source-layer": "aeroway",
      paint: {
        "line-color": "#DDDAE8",
        "line-width": expWidth([
          [10, 1],
          [14, 6],
          [16, 14],
        ]),
      },
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
        "line-width": expWidth([
          [15, 1],
          [18, 3.5],
        ]),
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
      filter: ["!", ["in", ["get", "class"], ["literal", [...MAJEURES, "path", "track"]]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#CDC9DD",
        "line-width": expWidth([
          [11, 1],
          [14, 3.2],
          [16, 7],
          [18, 17],
        ]),
      },
    },
    {
      id: "basemap-roads-major-casing",
      type: "line",
      source: "basemap",
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", MAJEURES]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#E3B76F",
        "line-width": expWidth([
          [9, 2],
          [12, 4.5],
          [14, 7],
          [16, 11],
          [18, 26],
        ]),
      },
    },
    {
      id: "basemap-roads-minor",
      type: "line",
      source: "basemap",
      "source-layer": "transportation",
      minzoom: 11,
      filter: ["!", ["in", ["get", "class"], ["literal", [...MAJEURES, "path", "track"]]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": MAP_COLORS.road,
        "line-width": expWidth([
          [11, 0.5],
          [14, 2],
          [16, 5.2],
          [18, 14],
        ]),
      },
    },
    {
      id: "basemap-roads-major",
      type: "line",
      source: "basemap",
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", MAJEURES]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#FFE0A8",
        "line-width": expWidth([
          [9, 1.2],
          [12, 3],
          [14, 5],
          [16, 8.5],
          [18, 22],
        ]),
      },
    },
  ];
}
