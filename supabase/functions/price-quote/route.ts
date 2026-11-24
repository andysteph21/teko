// Appel Valhalla commun au devis de commande et au devis de modification.
import { quoteMetrics } from "./metrics.ts";

export interface Point {
  lon: number;
  lat: number;
}
export function validPoint(p: unknown): p is Point {
  if (!p || typeof p !== "object") return false;
  const v = p as Point;
  return Number.isFinite(v.lon) && Number.isFinite(v.lat) &&
    Math.abs(v.lon) <= 180 && Math.abs(v.lat) <= 90;
}

/** Un seul tronçon : la polyligne telle quelle. Plusieurs : tableau JSON,
 *  reconnaissable car une polyligne encodée ne contient jamais de guillemet. */
export function joinShapes(shapes: string[]): string {
  return shapes.length === 1 ? shapes[0] : JSON.stringify(shapes);
}

export type RouteOutcome =
  | { error: string; status: number }
  | { distanceM: number; durationS: number; shape: string };

export async function fetchRoute(
  locations: Point[],
  costing: "auto" | "motorcycle",
): Promise<RouteOutcome> {
  const url = Deno.env.get("VALHALLA_URL");
  if (!url) return { error: "ROUTING_UNAVAILABLE", status: 503 };
  const route = await fetch(`${url.replace(/\/$/, "")}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locations: locations.map(({ lon, lat }) => ({ lon, lat })),
      costing,
      units: "kilometers",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!route.ok) {
    return route.status === 400 || route.status === 422
      ? { error: "ROUTE_NOT_FOUND", status: 422 }
      : { error: "ROUTING_UNAVAILABLE", status: 503 };
  }
  const payload = await route.json();
  const metrics = quoteMetrics(payload.trip?.summary);
  if (metrics.error) {
    return {
      error: metrics.error,
      status: metrics.error === "POINTS_TOO_CLOSE" ? 422 : 503,
    };
  }
  const shapes = (payload.trip?.legs ?? []).map((leg: { shape?: unknown }) =>
    leg.shape
  );
  if (
    !shapes.length ||
    shapes.some((shape: unknown) => typeof shape !== "string" || !shape)
  ) {
    return { error: "ROUTING_UNAVAILABLE", status: 503 };
  }
  return { ...metrics, shape: joinShapes(shapes) };
}
