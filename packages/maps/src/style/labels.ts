// Étiquettes du fond — hiérarchie par zoom, densité par collision.
// MapLibre masque automatiquement toute étiquette qui en chevauche une
// autre : `symbol-sort-key` (rang OSM croissant) décide qui gagne, et
// `text-padding` règle l'espacement — c'est le curseur `labelDensity`.

import { type LabelContext, type Layer, POI_MAJEURS, POI_QUARTIER } from "./helpers";

export function basemapLabelLayers(ctx: LabelContext): Layer[] {
  const { fonts, padding, zShift, halo } = ctx;
  return [
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
      filter: [
        "in",
        ["get", "class"],
        ["literal", ["suburb", "quarter", "neighbourhood", "village", "hamlet"]],
      ],
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
      filter: [
        "!",
        ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
      ],
      layout: {
        "symbol-placement": "line",
        "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]],
        "text-font": [fonts.regular],
        "text-size": 10.5,
        "text-padding": padding,
      },
      paint: { "text-color": "#6E6E85", ...halo },
    },
  ];
}
