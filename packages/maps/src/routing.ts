// Client Valhalla (cœur pur, fetch standard) — itinéraire réel entre deux
// points : géométrie décodée (polyline6), distance et durée. Costing par
// catégorie de course : moto-taxi → motorcycle, sinon auto (labo vérifié).

import { decodePolyline6, type LonLat } from "./geo";

export interface RouteResult {
  coordinates: LonLat[];
  distanceM: number;
  durationS: number;
}

export type RouteCosting = "auto" | "motorcycle";

interface ValhallaLeg {
  shape: string;
}

interface ValhallaTrip {
  trip?: {
    legs?: ValhallaLeg[];
    summary?: { length?: number; time?: number };
  };
}

/** Coût de calcul par catégorie de course Teko. */
export function costingForCategory(category: string): RouteCosting {
  return category === "moto" ? "motorcycle" : "auto";
}

/** Itinéraire Valhalla — lève en cas d'échec réseau ou de réponse vide. */
export async function fetchRoute(
  valhallaUrl: string,
  from: LonLat,
  to: LonLat,
  costing: RouteCosting = "auto",
): Promise<RouteResult> {
  const response = await fetch(`${valhallaUrl.replace(/\/$/, "")}/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      locations: [
        { lat: from.lat, lon: from.lon },
        { lat: to.lat, lon: to.lon },
      ],
      costing,
      units: "kilometers",
    }),
  });
  if (!response.ok) {
    throw new Error(`Valhalla /route: ${String(response.status)}`);
  }
  const data = (await response.json()) as ValhallaTrip;
  const leg = data.trip?.legs?.[0];
  const summary = data.trip?.summary;
  if (!leg?.shape || !summary) {
    throw new Error("Valhalla /route: réponse sans itinéraire");
  }
  return {
    coordinates: decodePolyline6(leg.shape),
    distanceM: Math.round((summary.length ?? 0) * 1000),
    durationS: Math.round(summary.time ?? 0),
  };
}
