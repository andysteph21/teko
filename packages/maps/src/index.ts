// @teko/maps — cœur sans dépendance de rendu.
// Le contrôleur web (MapLibre GL JS) s'importe via `@teko/maps/web`.

export { MAP_COLORS, type MapColorToken } from "./tokens.js";
export {
  type LonLat,
  ewktPoint,
  roundPosition,
  distanceM,
  bboxAround,
  parseEwkbPoint,
  toLonLat,
  decodePolyline6,
  type GeomInput,
  type GeoJsonPointLike,
} from "./geo.js";
export {
  type Feature,
  type FeatureCollection,
  type LandmarkRow,
  type VehiclePosition,
  type SavedPlaceRow,
  type ProposedRoadRow,
  type DepartureHotspot,
  LANDMARK_LETTERS,
  landmarkLetter,
  savedPlacesToGeoJson,
  proposedRoadsToGeoJson,
  departureHotspotsToGeoJson,
  landmarksToGeoJson,
  clientPositionToGeoJson,
  vehiclesToGeoJson,
  routeToGeoJson,
  emptyFeatureCollection,
} from "./geojson.js";
export { TEKO_SOURCES, type MapStyleOptions, buildMapStyle } from "./style.js";
export {
  type MapMode,
  type MapModePreference,
  type NetworkHint,
  type ResolvedMapMode,
  resolveMapMode,
} from "./mode.js";
export {
  TekoMapData,
  type NearestLandmarksOptions,
  type ProposeLandmarkInput,
  type RidePositionEvent,
} from "./adapter.js";
