// Les 10 catégories de repère (union ProposeLandmarkInput de @teko/maps),
// dans l'ordre d'affichage du sélecteur C-26. Libellés français dans
// strings.ts (places:proposer.categories.<valeur>).

import type { ProposeLandmarkInput } from "@teko/maps";

export type LandmarkCategory = ProposeLandmarkInput["category"];

export const LANDMARK_CATEGORY_VALUES: readonly LandmarkCategory[] = [
  "fuel_station",
  "roundabout",
  "market",
  "church",
  "school",
  "pharmacy",
  "bar",
  "building",
  "junction",
  "other",
] as const;
