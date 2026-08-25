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
  geometry:
    | { type: "Point"; coordinates: [number, number] }
    | { type: "LineString"; coordinates: [number, number][] };
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

const pointFeature = (p: LonLat, properties: Record<string, unknown>, id?: string): Feature => ({
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
          lettre: landmarkLetter(r.category),
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
    vehicles.map((v) => pointFeature(v, { kind: "vehicle", bearing: v.bearing ?? 0 }, v.id)),
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

// ---------------------------------------------------------------------------
// Vocabulaire carte étendu : lieux favoris, routes à confirmer, zones de
// départ fréquentes. Convertisseurs purs, comme le reste du fichier.
// ---------------------------------------------------------------------------

/** Initiale affichée dans l'épingle d'un repère, par catégorie. */
export const LANDMARK_LETTERS: Record<string, string> = {
  market: "M",
  pharmacy: "P",
  school: "É",
  church: "E",
  fuel_station: "S",
  roundabout: "R",
  bar: "B",
  building: "■",
  junction: "C",
  other: "●",
};

export function landmarkLetter(category: string): string {
  return LANDMARK_LETTERS[category] ?? LANDMARK_LETTERS.other!;
}

export interface SavedPlaceRow {
  id: string;
  kind: "home" | "work" | "other";
  label: string;
  geom: GeomInput;
}

/** Lieux favoris / points de départ habituels du client (C-08, C-19).
 *  Symbole : D (domicile), T (travail), ★ (autre favori). */
export function savedPlacesToGeoJson(rows: SavedPlaceRow[]): FeatureCollection {
  const lettre = { home: "D", work: "T", other: "★" } as const;
  return fc(
    rows.map((r) =>
      pointFeature(
        toLonLat(r.geom),
        { kind: "saved_place", place_kind: r.kind, label: r.label, lettre: lettre[r.kind] },
        r.id,
      ),
    ),
  );
}

export interface ProposedRoadRow {
  id: string;
  coordinates: LonLat[];
  /** Nombre de passages GPS observés (affiché à l'admin/chauffeur). */
  supportCount?: number;
}

/** Routes détectées mais PAS ENCORE validées — « à confirmer ».
 *  Affichées en pointillés neutres, jamais comme de la voirie réelle. */
export function proposedRoadsToGeoJson(rows: ProposedRoadRow[]): FeatureCollection {
  return fc(
    rows
      .filter((r) => r.coordinates.length >= 2)
      .map((r) => ({
        type: "Feature" as const,
        id: r.id,
        geometry: {
          type: "LineString" as const,
          coordinates: r.coordinates.map((p) => [p.lon, p.lat] as [number, number]),
        },
        properties: { kind: "proposed_road", support: r.supportCount ?? 0 },
      })),
  );
}

export interface DepartureHotspot extends LonLat {
  id: string;
  /** Poids relatif (nb de départs récents) — taille du halo. */
  count: number;
}

/** Zones de départ fréquentes (aide au positionnement chauffeur, D-09). */
export function departureHotspotsToGeoJson(spots: DepartureHotspot[]): FeatureCollection {
  return fc(spots.map((s) => pointFeature(s, { kind: "departure_hotspot", count: s.count }, s.id)));
}
