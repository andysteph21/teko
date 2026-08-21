// Géométrie pure, sans dépendance : formats PostGIS, arrondis de sobriété,
// distances. Utilisée par l'adaptateur Supabase et les convertisseurs GeoJSON.

export interface LonLat {
  lon: number;
  lat: number;
}

/** Point EWKT (SRID 4326) — format accepté par PostgREST pour les colonnes
 *  et paramètres `geometry`. */
export function ewktPoint(p: LonLat): string {
  return `SRID=4326;POINT(${p.lon} ${p.lat})`;
}

/**
 * Arrondi de sobriété : 5 décimales (~1 m) en mode normal, 4 (~11 m) en mode
 * éco. Réduit le payload ET évite de diffuser une position exacte au mètre
 * (cf. 05-decisions-et-transverses.md §1 — « positions arrondies »).
 */
export function roundPosition(p: LonLat, eco = false): LonLat {
  const f = eco ? 1e4 : 1e5;
  return { lon: Math.round(p.lon * f) / f, lat: Math.round(p.lat * f) / f };
}

/** Distance haversine en mètres. */
export function distanceM(a: LonLat, b: LonLat): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Décode un Point EWKB hexadécimal (format renvoyé par PostgREST pour les
 * colonnes PostGIS `geometry`). Gère les deux ordres d'octets et le drapeau
 * SRID. Points uniquement — les LineString viendront avec le pipeline routes.
 */
export function parseEwkbPoint(hex: string): LonLat {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  const littleEndian = bytes[0] === 1;
  const rawType = view.getUint32(1, littleEndian);
  const hasSrid = (rawType & 0x20000000) !== 0;
  if ((rawType & 0xff) !== 1) {
    throw new Error(`parseEwkbPoint: pas un Point (type ${rawType & 0xff})`);
  }
  const offset = hasSrid ? 9 : 5;
  return {
    lon: view.getFloat64(offset, littleEndian),
    lat: view.getFloat64(offset + 8, littleEndian),
  };
}

/** Point GeoJSON minimal tel que sérialisé par PostgREST et Realtime. */
export interface GeoJsonPointLike {
  type: "Point";
  coordinates: [number, number] | number[];
}

export type GeomInput = string | GeoJsonPointLike;

/**
 * Normalise une géométrie Point reçue de Supabase, quel que soit le canal :
 * PostgREST et Realtime sérialisent en **objet GeoJSON**, certaines chaînes
 * (exports, WAL brut) arrivent en **EWKB hexadécimal**. Vérifié contre la
 * stack locale le 20 août 2026.
 */
export function toLonLat(geom: GeomInput): LonLat {
  if (typeof geom === "string") return parseEwkbPoint(geom);
  if (geom && geom.type === "Point" && Array.isArray(geom.coordinates)) {
    const [lon, lat] = geom.coordinates;
    if (typeof lon === "number" && typeof lat === "number") return { lon, lat };
  }
  throw new Error(`toLonLat: géométrie Point invalide (${JSON.stringify(geom).slice(0, 80)})`);
}

/**
 * Décode une polyligne encodée précision 6 (format des `shape` Valhalla)
 * en liste de positions. Algorithme polyline Google, pas de dépendance.
 */
export function decodePolyline6(encoded: string): LonLat[] {
  const points: LonLat[] = [];
  let lat = 0;
  let lon = 0;
  let i = 0;
  const next = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lon += next();
    points.push({ lon: lon / 1e6, lat: lat / 1e6 });
  }
  return points;
}

/** Cap en degrés (0 = nord, sens horaire) de a vers b. */
export function bearingBetween(a: LonLat, b: LonLat): number {
  const rad = Math.PI / 180;
  const dLon = (b.lon - a.lon) * rad;
  const y = Math.sin(dLon) * Math.cos(b.lat * rad);
  const x =
    Math.cos(a.lat * rad) * Math.sin(b.lat * rad) -
    Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Position et cap à la fraction t ∈ [0,1] d'une polyligne, paramétrée par la
 * DISTANCE (pas par l'index des sommets) : la progression est régulière même
 * si les segments sont inégaux. Cœur pur des animations de véhicule.
 */
export function pointAlong(route: LonLat[], t: number): { position: LonLat; bearing: number } {
  if (route.length === 0) throw new Error("pointAlong: itinéraire vide");
  const first = route[0]!;
  if (route.length === 1) return { position: first, bearing: 0 };
  const clamped = Math.min(1, Math.max(0, t));
  const cumul: number[] = [0];
  for (let i = 1; i < route.length; i++) {
    cumul.push(cumul[i - 1]! + distanceM(route[i - 1]!, route[i]!));
  }
  const total = cumul[cumul.length - 1]!;
  if (total === 0) return { position: first, bearing: 0 };
  const target = clamped * total;
  let i = 1;
  while (i < cumul.length - 1 && cumul[i]! < target) i++;
  const a = route[i - 1]!;
  const b = route[i]!;
  const segLen = cumul[i]! - cumul[i - 1]!;
  const f = segLen === 0 ? 0 : (target - cumul[i - 1]!) / segLen;
  return {
    position: { lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f },
    bearing: bearingBetween(a, b),
  };
}

/** Cadre englobant [ouest, sud, est, nord] avec marge (mètres approx.). */
export function bboxAround(points: LonLat[], paddingM = 200): [number, number, number, number] {
  if (points.length === 0) throw new Error("bboxAround: aucun point");
  const degLat = paddingM / 111_320;
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const degLon = degLat / Math.max(Math.cos((midLat * Math.PI) / 180), 0.01);
  return [
    Math.min(...lons) - degLon,
    Math.min(...lats) - degLat,
    Math.max(...lons) + degLon,
    Math.max(...lats) + degLat,
  ];
}
