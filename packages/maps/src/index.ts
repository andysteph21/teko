// @teko/maps — cœur sans dépendance de rendu.
// Le contrôleur web (MapLibre GL JS) s'importe via `@teko/maps/web`.

export {
  type NearestLandmarksOptions,
  type ProposeLandmarkInput,
  type RidePositionEvent,
  TekoMapData,
} from "./adapter.js";
export {
  bboxAround,
  decodePolyline6,
  distanceM,
  ewktPoint,
  type GeoJsonPointLike,
  type GeomInput,
  type LonLat,
  parseEwkbPoint,
  roundPosition,
  toLonLat,
} from "./geo.js";
export {
  clientPositionToGeoJson,
  type DepartureHotspot,
  departureHotspotsToGeoJson,
  emptyFeatureCollection,
  type Feature,
  type FeatureCollection,
  LANDMARK_LETTERS,
  type LandmarkRow,
  landmarkLetter,
  landmarksToGeoJson,
  type ProposedRoadRow,
  proposedRoadsToGeoJson,
  routeToGeoJson,
  type SavedPlaceRow,
  savedPlacesToGeoJson,
  type VehiclePosition,
  vehiclesToGeoJson,
} from "./geojson.js";
export {
  type MapMode,
  type MapModePreference,
  type NetworkHint,
  type ResolvedMapMode,
  resolveMapMode,
} from "./mode.js";
export { buildMapStyle, type MapStyleOptions, TEKO_SOURCES } from "./style.js";
export { MAP_COLORS, type MapColorToken } from "./tokens.js";
