import type { RideRow } from "@teko/types";
import type { TekoClient } from "./client";
import { TekoApiError } from "./errors";
import { listMyRides } from "./rides";

export interface RideHistoryCache {
  read(userId: string): Promise<RideRow[] | null>;
  write(userId: string, rows: RideRow[]): Promise<void>;
}

/** Repli uniquement sur une panne réseau, jamais sur un refus du serveur. */
export async function cachedRideHistory(
  client: TekoClient,
  userId: string,
  cache: RideHistoryCache,
): Promise<RideRow[]> {
  try {
    const rows = await listMyRides(client, 50);
    // L'historique local n'a besoin ni du PIN ni des coordonnées précises.
    const safe = rows.map((row) => ({
      ...row,
      pin_code: null,
      origin_geom: null,
      dest_geom: null,
    }));
    await cache.write(userId, safe).catch(() => undefined);
    return rows;
  } catch (error) {
    if (!(error instanceof TekoApiError) || error.code !== "network") throw error;
    const rows = await cache.read(userId);
    if (rows === null) throw error;
    return rows;
  }
}
