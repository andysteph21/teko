// Pictogrammes & couches d'animation installés au chargement du style —
// lisibles sans texte : épingle-personne au départ, épingle-drapeau à
// l'arrivée, position qui pulse, attente qui respire, voiture orientée.

import type * as maplibregl from "maplibre-gl";
import { LANDMARK_LETTERS } from "../geojson";
import { TEKO_SOURCES } from "../style";
import { makeLetterImage, makePin, makePulse } from "./animations";

export function installPictos(m: maplibregl.Map): void {
  m.addImage("teko-pin-depart", makePin("person", "#8C238A"), { pixelRatio: 2 });
  m.addImage("teko-pin-dest", makePin("flag", "#3D0F5C"), { pixelRatio: 2 });
  m.addImage("teko-pulse-client", makePulse(m, "#8C238A") as never, { pixelRatio: 2 });
  m.addImage("teko-pulse-vehicle", makePulse(m, "#00BFA5") as never, { pixelRatio: 2 });

  m.addSource("teko-endpoints", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  // Pulsation sous le point client (anneau magenta qui s'étend).
  m.addLayer(
    {
      id: "teko-client-pulse",
      type: "symbol",
      source: TEKO_SOURCES.client,
      layout: {
        "icon-image": "teko-pulse-client",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    },
    "teko-client-dot",
  );
  // Halo d'attente du véhicule (anneau teal), activé via setVehicleWaiting.
  m.addLayer(
    {
      id: "teko-vehicle-pulse",
      type: "symbol",
      source: TEKO_SOURCES.vehicles,
      layout: {
        "icon-image": "teko-pulse-vehicle",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        visibility: "none",
      },
    },
    "teko-vehicles-dot",
  );
  // Passager à bord : point magenta au cœur du véhicule (setClientAboard).
  m.addLayer({
    id: "teko-vehicle-aboard",
    type: "circle",
    source: TEKO_SOURCES.vehicles,
    layout: { visibility: "none" },
    paint: {
      "circle-color": "#8C238A",
      "circle-radius": 4,
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 1.5,
    },
  });

  installEcoLetterLayers(m);

  // Épingles départ/arrivée, ancrées à la pointe.
  m.addLayer({
    id: "teko-endpoints-pins",
    type: "symbol",
    source: "teko-endpoints",
    layout: {
      "icon-image": ["get", "icon"],
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.7, 15, 1],
    },
  });
}

// ÉCO (pas de glyphes distants) : les initiales de catégories et les
// lettres D/T/★ sont rendues en images canvas (police système, zéro
// octet réseau) — le mode éco reste lisible sans texte téléchargé.
function installEcoLetterLayers(m: maplibregl.Map): void {
  if (m.getLayer("teko-landmarks-letter")) return;
  const lettres = new Set([...Object.values(LANDMARK_LETTERS), "D", "T", "★"]);
  for (const l of lettres) {
    m.addImage(`teko-lettre-amber-${l}`, makeLetterImage(l, "#4A2F03"), { pixelRatio: 2 });
    m.addImage(`teko-lettre-brand-${l}`, makeLetterImage(l, "#5A1A80"), { pixelRatio: 2 });
  }
  m.addLayer({
    id: "teko-landmarks-letter-eco",
    type: "symbol",
    source: TEKO_SOURCES.landmarks,
    layout: {
      "icon-image": ["concat", "teko-lettre-amber-", ["get", "lettre"]],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
  m.addLayer({
    id: "teko-saved-places-dot-eco",
    type: "circle",
    source: TEKO_SOURCES.savedPlaces,
    paint: {
      "circle-color": "#FFFFFF",
      "circle-radius": 9,
      "circle-stroke-color": "#8C238A",
      "circle-stroke-width": 2.5,
    },
  });
  m.addLayer({
    id: "teko-saved-places-letter-eco",
    type: "symbol",
    source: TEKO_SOURCES.savedPlaces,
    layout: {
      "icon-image": ["concat", "teko-lettre-brand-", ["get", "lettre"]],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
}
