// Devis de commande : course, covoiturage à la place ou livraison.
import { fetchRoute, validPoint } from "./route.ts";

const CATEGORIES = ["eco", "moto", "confort", "covoiturage"];

/** Surface minimale du client utilisée ici ; index.ts injecte le vrai. */
export interface QuoteDb {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{
    // deno-lint-ignore no-explicit-any -- forme libre des retours RPC
    data: any;
    error: { code?: string; message: string } | null;
  }>;
}

export interface Failure {
  code: string;
  status: number;
}

/** Options facultatives : places de covoiturage et type de service. */
export function quoteOptions(body: Record<string, unknown>) {
  const options: Record<string, unknown> = {};
  if (body.seats !== undefined) options.seats = body.seats;
  if (body.service !== undefined) options.service = body.service;
  return options;
}

export async function tripQuote(
  db: QuoteDb,
  actor: string,
  body: Record<string, unknown>,
): Promise<Failure | { data: unknown }> {
  const { origin, destination, category } = body;
  if (
    !validPoint(origin) || !validPoint(destination) ||
    typeof category !== "string" || !CATEGORIES.includes(category)
  ) {
    return { code: "INVALID_TRIP", status: 400 };
  }
  if (origin.lon === destination.lon && origin.lat === destination.lat) {
    return { code: "POINTS_TOO_CLOSE", status: 422 };
  }
  const route = await fetchRoute(
    [origin, destination],
    category === "moto" ? "motorcycle" : "auto",
  );
  if ("error" in route) return { code: route.error, status: route.status };
  const options = quoteOptions(body);
  const { data, error } = await db.rpc("create_ride_quote", {
    p_client: actor,
    p_category: category,
    p_origin: `SRID=4326;POINT(${origin.lon} ${origin.lat})`,
    p_dest: `SRID=4326;POINT(${destination.lon} ${destination.lat})`,
    p_distance_m: route.distanceM,
    p_duration_s: route.durationS,
    p_shape: route.shape,
    ...(Object.keys(options).length ? { p_options: options } : {}),
  });
  if (error?.code === "42501") return { code: "QUOTE_FORBIDDEN", status: 403 };
  if (error?.code === "22023") {
    if (error.message === "Départ hors zone de service") {
      return { code: "OUTSIDE_SERVICE_AREA", status: 422 };
    }
    if (error.message === "Service non ouvert") {
      return { code: "SERVICE_CLOSED", status: 422 };
    }
    return { code: "INVALID_TRIP", status: 400 };
  }
  if (error || !data) return { code: "QUOTE_UNAVAILABLE", status: 503 };
  return { data };
}
