// @teko/maps — cœur sans dépendance de rendu.
// Le contrôleur web (MapLibre GL JS) s'importe via `@teko/maps/web`.

export {
  type NearestLandmarksOptions,
  type ProposeLandmarkInput,
  type RidePositionEvent,
  TekoMapData,
} from "./adapter";
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
} from "./geo";
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
} from "./geojson";
export {
  type MapMode,
  type MapModePreference,
  type NetworkHint,
  type ResolvedMapMode,
  resolveMapMode,
} from "./mode";
export { buildMapStyle, type MapStyleOptions, TEKO_SOURCES } from "./style";
export { MAP_COLORS, type MapColorToken } from "./tokens";
