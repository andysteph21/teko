// Sécurité en course : partage de trajet (lien public à durée limitée),
// SOS et signalements (C-27 — le SOS alerte immédiatement les ops).

import type { DbEnum, TableRow } from "@teko/types";
import type { TekoClient } from "./client.js";
import { unwrap } from "./errors.js";

/** Lien de partage : jeton public, expire à la fin de course (TTL 24 h). */
export async function createTripShare(
  client: TekoClient,
  rideId: string,
): Promise<TableRow<"trip_shares">> {
  return unwrap(
    await client.rpc("create_trip_share", { p_ride: rideId }),
  ) as TableRow<"trip_shares">;
}

export interface SharedTripView {
  status: string;
  category: string;
  plate: string | null;
  driverFirstName: string | null;
  destLandmark: string | null;
  lastPosition: unknown;
  updatedAt: string | null;
}

/** Vue publique d'un trajet partagé — appelable SANS session (page web).
 *  Jeton inconnu/expiré → null, jamais d'erreur. */
export async function getSharedTrip(
  client: TekoClient,
  token: string,
): Promise<SharedTripView | null> {
  const raw = unwrap(await client.rpc("get_shared_trip", { p_token: token })) as Record<
    string,
    unknown
  > | null;
  if (!raw) return null;
  return {
    status: raw.status as string,
    category: raw.category as string,
    plate: (raw.plate as string) ?? null,
    driverFirstName: (raw.driver_first_name as string) ?? null,
    destLandmark: (raw.dest_landmark as string) ?? null,
    lastPosition: raw.last_position ?? null,
    updatedAt: (raw.updated_at as string) ?? null,
  };
}

export interface ReportIncidentInput {
  kind: DbEnum<"incident_kind">;
  message?: string;
  rideId?: string;
}

/** SOS / signalement / litige — un SOS notifie tous les admins ops. */
export async function reportIncident(
  client: TekoClient,
  input: ReportIncidentInput,
): Promise<TableRow<"incidents">> {
  return unwrap(
    await client.rpc("report_incident", {
      p_kind: input.kind,
      ...(input.message ? { p_message: input.message } : {}),
      ...(input.rideId ? { p_ride: input.rideId } : {}),
    }),
  ) as TableRow<"incidents">;
}
