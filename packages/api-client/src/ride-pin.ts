import type { TekoClient } from "./client";
import { unwrap } from "./errors";

/** Lecture privée du code par le seul passager ; jamais incluse dans rides. */
export async function getRidePin(client: TekoClient, rideId: string): Promise<string> {
  return unwrap(await client.rpc("ride_pin", { p_ride: rideId }));
}
