// Surcouches Teko (repères, itinéraire, véhicules, client, favoris, routes
// proposées, zones de départ) — présentes dans les deux régimes, alimentées
// par les sources GeoJSON nommées de TEKO_SOURCES.

import { MAP_COLORS } from "../tokens";
import type { FontStacks, Layer } from "./helpers";
import { TEKO_SOURCES } from "./sources";

export interface TekoLayerContext {
  fonts: FontStacks;
  padding: number;
  halo: Record<string, unknown>;
  glyphsUrl: string | undefined;
}

export function tekoOverlayLayers(ctx: TekoLayerContext): Layer[] {
  const { fonts, padding, halo, glyphsUrl } = ctx;
  return [
    // Zones de départ fréquentes (chauffeur, D-09) : halos magenta très
    // doux, taille selon la fréquence — un fond d'aide, jamais un marqueur.
    {
      id: "teko-hotspots-halo",
      type: "circle",
      source: TEKO_SOURCES.departureHotspots,
      paint: {
        "circle-color": MAP_COLORS.markerClient,
        "circle-opacity": 0.13,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["to-number", ["get", "count"], 0],
          1,
          18,
          30,
          46,
        ],
        "circle-stroke-color": MAP_COLORS.markerClient,
        "circle-stroke-opacity": 0.35,
        "circle-stroke-width": 1.5,
      },
    },
    // Routes « à confirmer » (détectées par traces GPS, en attente admin) :
    // pointillé violet-gris, jamais confondable avec la voirie réelle.
    {
      id: "teko-proposed-roads-line",
      type: "line",
      source: TEKO_SOURCES.proposedRoads,
      layout: { "line-cap": "round" },
      paint: {
        "line-color": "#8B7FB0",
        "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 1.8, 16, 4.5, 18, 9],
        "line-dasharray": [0.2, 2],
      },
    },
    // Itinéraire : liseré BLANC sous le violet du token — l'itinéraire
    // reste net sur n'importe quel fond (axes ambre, bâtiments, éco).
    {
      id: "teko-route-casing",
      type: "line",
      source: TEKO_SOURCES.route,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": MAP_COLORS.halo, "line-width": 8.5, "line-opacity": 0.9 },
    },
    {
      id: "teko-route-line",
      type: "line",
      source: TEKO_SOURCES.route,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": MAP_COLORS.routeLine, "line-width": 5 },
    },
    // Repères : épingle ambre, TAILLE SELON LA SAILLANCE (le repère connu
    // de tous est plus gros), initiale de catégorie au centre.
    {
      id: "teko-landmarks-dot",
      type: "circle",
      source: TEKO_SOURCES.landmarks,
      paint: {
        "circle-color": MAP_COLORS.markerLandmark,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["to-number", ["get", "salience"], 0],
          0,
          7,
          10,
          10,
        ],
        "circle-stroke-color": MAP_COLORS.halo,
        "circle-stroke-width": 2,
      },
    },
    ...(glyphsUrl ? textLayers(fonts, padding, halo) : []),
    ...(glyphsUrl ? landmarkLabelLayer(fonts, padding) : []),
    // Véhicules : teal cerclé de blanc + flèche de cap (▲ pivote avec la
    // carte — on voit dans quel sens roule le chauffeur).
    {
      id: "teko-vehicles-dot",
      type: "circle",
      source: TEKO_SOURCES.vehicles,
      paint: {
        "circle-color": MAP_COLORS.markerDriver,
        "circle-radius": 9,
        "circle-stroke-color": MAP_COLORS.halo,
        "circle-stroke-width": 2.5,
      },
    },
    ...(glyphsUrl ? bearingLayer(fonts) : []),
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
  ];
}

/** Couches à texte des surcouches (lettres, favoris, mention « à confirmer »). */
function textLayers(fonts: FontStacks, padding: number, halo: Record<string, unknown>): Layer[] {
  return [
    {
      id: "teko-landmarks-letter",
      type: "symbol",
      source: TEKO_SOURCES.landmarks,
      layout: {
        "text-field": ["get", "lettre"],
        "text-font": [fonts.bold],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": "#4A2F03" },
    },
    // Lieux favoris / départs habituels : pastille blanche cerclée de
    // magenta, D (domicile), T (travail), ★ (favori) — langage client.
    {
      id: "teko-saved-places-dot",
      type: "circle",
      source: TEKO_SOURCES.savedPlaces,
      paint: {
        "circle-color": "#FFFFFF",
        "circle-radius": 9,
        "circle-stroke-color": MAP_COLORS.markerClient,
        "circle-stroke-width": 2.5,
      },
    },
    {
      id: "teko-saved-places-letter",
      type: "symbol",
      source: TEKO_SOURCES.savedPlaces,
      layout: {
        "text-field": ["get", "lettre"],
        "text-font": [fonts.bold],
        "text-size": 10.5,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": "#5A1A80" },
    },
    {
      id: "teko-saved-places-label",
      type: "symbol",
      source: TEKO_SOURCES.savedPlaces,
      minzoom: 13,
      layout: {
        "text-field": ["get", "label"],
        "text-font": [fonts.regular],
        "text-size": 11.5,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-padding": padding,
      },
      paint: { "text-color": "#6D2262", ...halo },
    },
    // « À confirmer » le long des routes proposées (zoom quartier).
    {
      id: "teko-proposed-roads-label",
      type: "symbol",
      source: TEKO_SOURCES.proposedRoads,
      minzoom: 14,
      layout: {
        "symbol-placement": "line",
        "text-field": ["concat", "à confirmer · ", ["to-string", ["get", "support"]], " passages"],
        "text-font": [fonts.regular],
        "text-size": 10.5,
        "text-padding": padding,
      },
      paint: { "text-color": "#655A8C", ...halo },
    },
  ];
}

// Nom des repères Teko — priorité à la saillance (le repère le plus connu
// gagne la place en cas de collision). Sans glyphes (éco hors-ligne),
// MapLibre refuse toute couche texte : l'app montre alors le nom en fiche.
function landmarkLabelLayer(fonts: FontStacks, padding: number): Layer[] {
  return [
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
  ];
}

function bearingLayer(fonts: FontStacks): Layer[] {
  return [
    {
      id: "teko-vehicles-bearing",
      type: "symbol",
      source: TEKO_SOURCES.vehicles,
      layout: {
        "text-field": "▲",
        "text-font": [fonts.bold],
        "text-size": 11,
        "text-rotate": ["get", "bearing"],
        "text-rotation-alignment": "map",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": "#04342C" },
    },
  ];
}
