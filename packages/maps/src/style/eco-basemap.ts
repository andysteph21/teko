// Mode éco ALLÉGÉ mais soigné : même langage visuel que le mode complet.
// L'astuce : les couches de contexte (végétation, eau, liserés) viennent des
// MÊMES tuiles z13 déjà téléchargées — les rendre ne coûte pas UN octet de
// plus. Ce qui reste coupé, c'est ce qui coûte : `maxzoom: 13` sur la source
// (sur-zoom au-delà → zéro requête en zoomant), aucune police (pas de texte),
// pas de bâtiments ni POI. Hors-ligne total (pas d'URL) : fond uni.

import { MAP_COLORS } from "../tokens";
import { expWidth, type Layer, ROADS_MAJEURES } from "./helpers";

export function ecoBasemapLayers(): Layer[] {
  const MAJ = ROADS_MAJEURES;
  return [
    {
      id: "eco-landcover",
      type: "fill",
      source: "basemap",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland", "wetland"]]],
      paint: { "fill-color": "#DEEAD9", "fill-opacity": 0.7 },
    },
    {
      id: "eco-park",
      type: "fill",
      source: "basemap",
      "source-layer": "park",
      paint: { "fill-color": "#D8E8D3", "fill-opacity": 0.8 },
    },
    {
      id: "eco-landuse",
      type: "fill",
      source: "basemap",
      "source-layer": "landuse",
      filter: ["in", ["get", "class"], ["literal", ["residential", "commercial", "industrial"]]],
      paint: { "fill-color": "#E9E7F0", "fill-opacity": 0.5 },
    },
    {
      id: "eco-water",
      type: "fill",
      source: "basemap",
      "source-layer": "water",
      paint: { "fill-color": "#BFD3ED" },
    },
    {
      id: "eco-waterway",
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
    {
      id: "eco-aeroway",
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
    {
      id: "eco-roads-minor-casing",
      type: "line",
      source: "basemap",
      "source-layer": "transportation",
      minzoom: 11,
      filter: ["!", ["in", ["get", "class"], ["literal", [...MAJ, "path", "track"]]]],
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
      id: "eco-roads-minor",
      type: "line",
      source: "basemap",
      "source-layer": "transportation",
      minzoom: 11,
      filter: ["!", ["in", ["get", "class"], ["literal", [...MAJ, "path", "track"]]]],
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
      id: "eco-roads-major-casing",
      type: "line",
      source: "basemap",
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", MAJ]],
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
      id: "eco-roads-major",
      type: "line",
      source: "basemap",
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", MAJ]],
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
