// Sources GeoJSON nommées des surcouches Teko — alimentées par le contrôleur
// web (setLandmarks, setRoute…) ou par les équivalents MapLibre Native en RN.

export const TEKO_SOURCES = {
  landmarks: "teko-landmarks",
  route: "teko-route",
  vehicles: "teko-vehicles",
  client: "teko-client",
  savedPlaces: "teko-saved-places",
  proposedRoads: "teko-proposed-roads",
  departureHotspots: "teko-departure-hotspots",
} as const;
