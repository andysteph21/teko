// Devis de modification de trajet : part de la position connue du serveur.
import { fetchRoute, type Point, validPoint } from "./route.ts";
import type { Failure, QuoteDb } from "./trip.ts";

interface Place extends Point {
  landmark_id?: string;
  hint?: string;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ne garde que les champs attendus ; null si un point est invalide. */
export function cleanPlace(input: unknown): Place | null {
  if (!validPoint(input)) return null;
  const raw = input as Place;
  if (raw.landmark_id !== undefined && !UUID.test(String(raw.landmark_id))) {
    return null;
  }
  if (
    raw.hint !== undefined &&
    (typeof raw.hint !== "string" || raw.hint.length > 200)
  ) return null;
  return {
    lon: raw.lon,
    lat: raw.lat,
    ...(raw.landmark_id ? { landmark_id: raw.landmark_id } : {}),
    ...(raw.hint ? { hint: raw.hint } : {}),
  };
}

const REFUSALS: Record<string, string> = {
  "Nombre d'arrêts maximal atteint": "TOO_MANY_STOPS",
  "Nombre de modifications maximal atteint": "TOO_MANY_CHANGES",
  "Trajet non modifiable à ce stade": "RIDE_NOT_EDITABLE",
  "Trajet non modifiable en covoiturage": "RIDE_NOT_EDITABLE",
};

export async function changeQuote(
  db: QuoteDb,
  actor: string,
  body: Record<string, unknown>,
): Promise<Failure | { data: unknown }> {
  const destination = cleanPlace(body.destination);
  const rawStops = Array.isArray(body.stops) ? body.stops : [];
  const stops = rawStops.map(cleanPlace);
  if (
    typeof body.ride_id !== "string" || !UUID.test(body.ride_id) ||
    !destination || stops.length > 4 || stops.some((stop) => !stop)
  ) {
    return { code: "INVALID_TRIP", status: 400 };
  }
  const from = await db.rpc("route_change_origin", {
    p_ride: body.ride_id,
    p_client: actor,
  });
  if (from.error?.code === "42501") {
    return { code: "QUOTE_FORBIDDEN", status: 403 };
  }
  if (from.error || !from.data) {
    return {
      code: REFUSALS[from.error?.message ?? ""] ?? "QUOTE_UNAVAILABLE",
      status: from.error?.code === "22023" ? 422 : 503,
    };
  }
  const route = await fetchRoute(
    [from.data as Point, ...(stops as Place[]), destination],
    from.data.category === "moto" ? "motorcycle" : "auto",
  );
  if ("error" in route) return { code: route.error, status: route.status };
  const { data, error } = await db.rpc("create_route_change_quote", {
    p_ride: body.ride_id,
    p_client: actor,
    p_dest: destination,
    p_stops: stops,
    p_route: {
      distance_m: route.distanceM,
      duration_s: route.durationS,
      shape: route.shape,
    },
  });
  if (error?.code === "42501") return { code: "QUOTE_FORBIDDEN", status: 403 };
  if (error?.code === "22023") {
    return { code: REFUSALS[error.message] ?? "INVALID_TRIP", status: 422 };
  }
  if (error || !data) return { code: "QUOTE_UNAVAILABLE", status: 503 };
  return { data };
}
