// Couleurs carte — extraites de docs/design/design-tokens.json (color.map + neutres).
// Source de vérité : le fichier de tokens ; toute divergence est un bug de fidélité
// (cf. docs/design/06-maquettes.md « Passage au code »).

export const MAP_COLORS = {
  /** Marqueur position passager (jamais utilisé côté chauffeur). */
  markerClient: "#8C238A",
  /** Marqueur véhicule chauffeur (teal — jamais dans l'app client hors carte). */
  markerDriver: "#00BFA5",
  /** Épingle point de repère (ambre). */
  markerLandmark: "#F5A623",
  /** Tracé de l'itinéraire retenu. */
  routeLine: "#5A1A80",
  /** Itinéraire alternatif. */
  routeLineAlternate: "#9090A8",
  /** Fond de carte clair (mode éco : fond uni, pas de tuiles). */
  background: "#F2F1F7",
  /** Voirie (mode éco : réseau simplifié blanc, comme les maquettes). */
  road: "#FFFFFF",
  /** Halo/contour des marqueurs. */
  halo: "#FFFFFF",
} as const;

export type MapColorToken = keyof typeof MAP_COLORS;
