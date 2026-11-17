// Valhalla calcule le trajet et Postgres fige le prix. Aucun point GPS en journal.
import { admin, json } from "../_shared/db.ts";
import { quoteMetrics } from "./metrics.ts";

interface Point {
  lon: number;
  lat: number;
}
function validPoint(p: unknown): p is Point {
  if (!p || typeof p !== "object") return false;
  const v = p as Point;
  return Number.isFinite(v.lon) && Number.isFinite(v.lat) &&
    Math.abs(v.lon) <= 180 && Math.abs(v.lat) <= 90;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "méthode non autorisée" }, 405);
  }
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "authentification requise" }, 401);
  const db = admin();
  const identity = await db.auth.getUser(token);
  if (identity.error || !identity.data.user) {
    return json({ error: "session invalide" }, 401);
  }
  const actor = identity.data.user.id;
  const requestId = crypto.randomUUID();
  const fail = (code: string, status: number) => {
    console.warn(
      JSON.stringify({
        event: "quote_rejected",
        requestId,
        actor,
        code,
        status,
      }),
    );
    return json({ code, request_id: requestId }, status);
  };

  const body = await req.json().catch(() => null);
  const { origin, destination, category } = body ?? {};
  if (
    !validPoint(origin) || !validPoint(destination) ||
    !["eco", "moto", "confort"].includes(category)
  ) {
    return fail("INVALID_TRIP", 400);
  }
  if (origin.lon === destination.lon && origin.lat === destination.lat) {
    return fail("POINTS_TOO_CLOSE", 422);
  }
  try {
    const url = Deno.env.get("VALHALLA_URL");
    if (!url) return fail("ROUTING_UNAVAILABLE", 503);
    const route = await fetch(`${url.replace(/\/$/, "")}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [{ lon: origin.lon, lat: origin.lat }, {
          lon: destination.lon,
          lat: destination.lat,
        }],
        costing: category === "moto" ? "motorcycle" : "auto",
        units: "kilometers",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!route.ok) {
      return route.status === 400 || route.status === 422
        ? fail("ROUTE_NOT_FOUND", 422)
        : fail("ROUTING_UNAVAILABLE", 503);
    }
    const payload = await route.json();
    const metrics = quoteMetrics(payload.trip?.summary);
    if (metrics.error) {
      return fail(
        metrics.error,
        metrics.error === "POINTS_TOO_CLOSE" ? 422 : 503,
      );
    }
    const shape = payload.trip?.legs?.[0]?.shape;
    if (typeof shape !== "string" || !shape) {
      return fail("ROUTING_UNAVAILABLE", 503);
    }
    const { data, error } = await db.rpc("create_ride_quote", {
      p_client: actor,
      p_category: category,
      p_origin: `SRID=4326;POINT(${origin.lon} ${origin.lat})`,
      p_dest: `SRID=4326;POINT(${destination.lon} ${destination.lat})`,
      p_distance_m: metrics.distanceM,
      p_duration_s: metrics.durationS,
      p_shape: shape,
    });
    if (error?.code === "42501") return fail("QUOTE_FORBIDDEN", 403);
    if (
      error?.code === "22023" && error.message === "Départ hors zone de service"
    ) {
      return fail("OUTSIDE_SERVICE_AREA", 422);
    }
    if (error || !data) return fail("QUOTE_UNAVAILABLE", 503);
    console.info(
      JSON.stringify({ event: "quote_created", requestId, actor, category }),
    );
    return json(data);
  } catch {
    return fail("QUOTE_UNAVAILABLE", 503);
  }
});
