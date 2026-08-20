// Conversion lignes Supabase → GeoJSON pour les sources MapLibre.
// Fonctions pures, testées unitairement.

import { type GeomInput, type LonLat, toLonLat } from "./geo.js";

export interface LandmarkRow {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  geom: GeomInput; // GeoJSON (PostgREST/Realtime) ou EWKB hex
  salience: number | string;
  usage_count: number;
  photo_url: string | null;
}

export interface Feature {
  type: "Feature";
  id?: string | number;
  geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: [number, number][] };
  properties: Record<string, unknown>;
}

export interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
}

const fc = (features: Feature[]): FeatureCollection => ({
  type: "FeatureCollection",
  features,
});

const pointFeature = (
  p: LonLat,
  properties: Record<string, unknown>,
  id?: string,
): Feature => ({
  type: "Feature",
  ...(id ? { id } : {}),
  geometry: { type: "Point", coordinates: [p.lon, p.lat] },
  properties,
});

/** Repères (épingles ambre) — depuis les lignes de nearest_landmarks. */
export function landmarksToGeoJson(rows: LandmarkRow[]): FeatureCollection {
  return fc(
    rows.map((r) =>
      pointFeature(
        toLonLat(r.geom),
        {
          kind: "landmark",
          name: r.name,
          category: r.category,
          salience: Number(r.salience),
          usage_count: r.usage_count,
        },
        r.id,
      ),
    ),
  );
}

/** Position du client (point magenta). */
export function clientPositionToGeoJson(p: LonLat): FeatureCollection {
  return fc([pointFeature(p, { kind: "client" })]);
}

export interface VehiclePosition extends LonLat {
  id: string;
  /** Cap en degrés (optionnel — oriente le véhicule). */
  bearing?: number;
}

/** Véhicules (teal) — présence chauffeurs ou véhicule de la course. */
export function vehiclesToGeoJson(vehicles: VehiclePosition[]): FeatureCollection {
  return fc(
    vehicles.map((v) =>
      pointFeature(v, { kind: "vehicle", bearing: v.bearing ?? 0 }, v.id),
    ),
  );
}

/**
 * Itinéraire (ligne violette). En attendant Valhalla (infra carto), la ligne
 * peut être une polyligne fournie par le serveur OU la droite origine →
 * destination en secours — l'appelant choisit.
 */
export function routeToGeoJson(coordinates: LonLat[]): FeatureCollection {
  if (coordinates.length < 2) return fc([]);
  return fc([
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coordinates.map((p) => [p.lon, p.lat]),
      },
      properties: { kind: "route" },
    },
  ]);
}

export const emptyFeatureCollection: FeatureCollection = fc([]);
