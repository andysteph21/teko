// Pastille Teko — marqueur des repères (décision du 12 novembre 2026) :
// carré arrondi ambre, pictogramme violet nuit par catégorie, taille selon
// la saillance. Les images viennent de la planche servie par Martin
// (/sprite/teko), dessinée dans infra/tiles/martin/sprites/teko.

import type { Layer } from "./helpers";

export const LANDMARK_SPRITE = "teko";
export const LANDMARK_LABEL_COLOR = "#3D0F5C";

/** Nom d'image de la planche pour une catégorie de repère. */
export const landmarkIcon = ["concat", "landmark-", ["coalesce", ["get", "category"], "other"]];

const salience = ["to-number", ["get", "salience"], 0];

interface Tier {
  id: string;
  filter: unknown[];
  minzoom: number;
  size: number;
}

/** Le repère connu de tous apparaît plus tôt et plus gros. */
const TIERS: Tier[] = [
  { id: "major", filter: [">=", salience, 7], minzoom: 11, size: 0.95 },
  {
    id: "mid",
    filter: ["all", [">=", salience, 5], ["<", salience, 7]],
    minzoom: 13.5,
    size: 0.78,
  },
  { id: "minor", filter: ["<", salience, 5], minzoom: 15, size: 0.62 },
];

export interface LandmarkLabelContext {
  font: string;
  halo: Record<string, unknown>;
  /** Faux en éco ou sans glyphes : pastille seule, aucun texte téléchargé. */
  labels: boolean;
}

/** Repères validés servis en tuiles : trois paliers de saillance, élagage
 *  par collision, le plus saillant prioritaire. */
export function validatedLandmarkLayers(ctx: LandmarkLabelContext): Layer[] {
  return TIERS.map((tier) => ({
    id: `teko-validated-landmark-${tier.id}`,
    type: "symbol",
    source: "teko-validated-landmarks",
    "source-layer": "landmarks",
    minzoom: tier.minzoom,
    filter: tier.filter,
    layout: {
      "icon-image": landmarkIcon,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 11, tier.size * 0.7, 16, tier.size],
      "icon-padding": 4,
      "symbol-sort-key": ["*", -1, salience],
      ...(ctx.labels
        ? {
            "text-field": ["get", "name"],
            "text-font": [ctx.font],
            "text-size": 12,
            "text-anchor": "top",
            "text-offset": [0, 1.25 * tier.size + 0.25],
            "text-max-width": 9,
            "text-optional": true,
          }
        : {}),
    },
    paint: ctx.labels ? { "text-color": LANDMARK_LABEL_COLOR, ...ctx.halo } : {},
  }));
}

/** Repères proches (source GeoJSON) : peu nombreux, toujours affichés. */
export function nearbyLandmarkIconLayer(source: string): Layer {
  return {
    id: "teko-landmarks-icon",
    type: "symbol",
    source,
    layout: {
      "icon-image": landmarkIcon,
      "icon-size": ["interpolate", ["linear"], salience, 0, 0.7, 10, 1.05],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  };
}
