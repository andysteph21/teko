// Aides partagées des modules de style — largeurs de voirie, constantes.

/** Couche MapLibre, typée large pour rester sans dépendance (cf. style.ts). */
export type Layer = Record<string, unknown>;

export interface FontStacks {
  regular: string;
  bold: string;
}

/** Contexte commun des couches à texte (étiquettes du fond + surcouches Teko). */
export interface LabelContext {
  fonts: FontStacks;
  padding: number;
  zShift: number;
  halo: Record<string, unknown>;
}

/** Largeur en interpolation EXPONENTIELLE (base 1.6) : les rues
 *  s'épaississent naturellement au zoom (fine à z12, large à z17). */
export const expWidth = (stops: [number, number][]) => [
  "interpolate",
  ["exponential", 1.6],
  ["zoom"],
  ...stops.flat(),
];

export const ROADS_MAJEURES = ["motorway", "trunk", "primary", "secondary"];

// Équipements « notables » (classes OpenMapTiles), en deux paliers :
// visibles tôt (structurants pour se repérer) vs détail de quartier.
export const POI_MAJEURS = [
  "hospital",
  "university",
  "stadium",
  "townhall",
  "police",
  "fire_station",
  "courthouse",
  "museum",
  "monument",
  "harbor",
  "ferry_terminal",
];

export const POI_QUARTIER = [
  "school",
  "college",
  "place_of_worship",
  "grocery",
  "shop",
  "mall",
  "bank",
  "fuel",
  "post",
  "pharmacy",
  "clinic",
  "doctors",
];
