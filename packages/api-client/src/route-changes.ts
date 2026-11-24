// Lot R3 — changement de destination et arrêts en cours de course.
// Scénarios de référence : supabase/tests/e2e/modification-trajet.test.ts.

import { decodePolyline6, type LonLat, type RouteResult, toLonLat } from "@teko/maps";
import type { TableRow } from "@teko/types";
import type { TekoClient } from "./client";
import { TekoApiError, unwrap } from "./errors";

export type RouteChange = TableRow<"ride_route_changes">;
export type RideStopRow = TableRow<"ride_stops">;

export interface RoutePlace {
  position: LonLat;
  landmarkId?: string;
  hint?: string;
}
export interface RideStop {
  id: string;
  seq: number;
  position: LonLat;
  landmarkId: string | null;
  hint: string | null;
  arrivedAt: string | null;
  leftAt: string | null;
  waitCharged: number;
}

const QUOTE_CODES: Record<string, TekoApiError["code"]> = {
  TOO_MANY_STOPS: "route_too_many_stops",
  TOO_MANY_CHANGES: "route_too_many_changes",
  RIDE_NOT_EDITABLE: "route_not_editable",
  ROUTE_NOT_FOUND: "quote_route_not_found",
  POINTS_TOO_CLOSE: "quote_points_too_close",
};

const place = (p: RoutePlace) => ({
  lon: p.position.lon,
  lat: p.position.lat,
  ...(p.landmarkId ? { landmark_id: p.landmarkId } : {}),
  ...(p.hint ? { hint: p.hint } : {}),
});

/** Devis de modification : le serveur part de sa dernière position connue. */
export async function getRouteChangeQuote(
  client: TekoClient,
  input: { rideId: string; destination: RoutePlace; stops?: RoutePlace[] },
): Promise<RouteChange> {
  const result = await client.functions.invoke<RouteChange>("price-quote", {
    body: {
      ride_id: input.rideId,
      destination: place(input.destination),
      stops: (input.stops ?? []).map(place),
    },
  });
  if (result.error && result.response?.status === 422) {
    const body = await result.response.json().catch(() => null);
    const code = QUOTE_CODES[body?.code];
    if (code) throw new TekoApiError(code, body.code, { requestId: body.request_id });
  }
  return unwrap(result);
}

/** Tracé du nouvel itinéraire : un tronçon, ou plusieurs joints en JSON. */
export function routeChangeRoute(change: RouteChange): RouteResult {
  const shapes: string[] = change.route_shape.startsWith('["')
    ? JSON.parse(change.route_shape)
    : [change.route_shape];
  return {
    coordinates: shapes.flatMap((shape) => decodePolyline6(shape)),
    distanceM: change.remaining_m,
    durationS: change.remaining_s,
  };
}

/** Le passager confirme le nouveau prix ; le chauffeur a 30 secondes. */
export async function requestRouteChange(
  client: TekoClient,
  changeId: string,
): Promise<RouteChange> {
  return unwrap(await client.rpc("request_route_change", { p_change: changeId }));
}

export async function respondRouteChange(
  client: TekoClient,
  changeId: string,
  accept: boolean,
): Promise<RouteChange> {
  return unwrap(await client.rpc("respond_route_change", { p_change: changeId, p_accept: accept }));
}

/** Dernière modification de la course (en attente, acceptée, refusée…). */
export async function latestRouteChange(
  client: TekoClient,
  rideId: string,
): Promise<RouteChange | null> {
  const rows = unwrap(
    await client
      .from("ride_route_changes")
      .select("*")
      .eq("ride_id", rideId)
      .neq("status", "quoted")
      .order("requested_at", { ascending: false })
      .limit(1),
  );
  return rows[0] ?? null;
}

/** Dernière modification ACCEPTÉE : c'est son tracé qui est en vigueur, même
 *  si une demande plus récente a été refusée ou a expiré. */
export async function acceptedRouteChange(
  client: TekoClient,
  rideId: string,
): Promise<RouteChange | null> {
  const rows = unwrap(
    await client
      .from("ride_route_changes")
      .select("*")
      .eq("ride_id", rideId)
      .eq("status", "accepted")
      .order("responded_at", { ascending: false })
      .limit(1),
  );
  return rows[0] ?? null;
}

function toStop(row: RideStopRow): RideStop {
  return {
    id: row.id,
    seq: row.seq,
    position: toLonLat(row.geom as never),
    landmarkId: row.landmark_id,
    hint: row.hint,
    arrivedAt: row.arrived_at,
    leftAt: row.left_at,
    waitCharged: Number(row.wait_charged),
  };
}

export async function listRideStops(client: TekoClient, rideId: string): Promise<RideStop[]> {
  const rows = unwrap(
    await client.from("ride_stops").select("*").eq("ride_id", rideId).order("seq"),
  );
  return rows.map(toStop);
}

export async function arriveStop(client: TekoClient, stopId: string): Promise<RideStop> {
  return toStop(unwrap(await client.rpc("arrive_stop", { p_stop: stopId })));
}

/** Départ de l'arrêt : l'attente au-delà de 3 minutes est ajoutée au prix. */
export async function leaveStop(client: TekoClient, stopId: string): Promise<RideStop> {
  return toStop(unwrap(await client.rpc("leave_stop", { p_stop: stopId })));
}
