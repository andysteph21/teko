// Lot R4 — covoiturage payé à la place.
// Scénarios de référence : supabase/tests/e2e/covoiturage.test.ts.

import type { TekoClient } from "./client";
import { unwrap } from "./errors";

export interface SharedTripStop {
  kind: "pickup" | "dropoff";
  /** Vrai pour les arrêts du passager lui-même ; rien d'autre n'est exposé. */
  mine: boolean;
  done: boolean;
}
export interface SharedTripProgress {
  seatsTaken: number;
  seatsTotal: number;
  stops: SharedTripStop[];
}

/** Ordre indicatif des arrêts du covoiturage, sans donnée des autres passagers. */
export async function sharedTripProgress(
  client: TekoClient,
  rideId: string,
): Promise<SharedTripProgress> {
  const raw = unwrap(await client.rpc("shared_trip_progress", { p_ride: rideId })) as unknown as {
    seats_taken: number;
    seats_total?: number;
    stops: SharedTripStop[];
  };
  return {
    seatsTaken: Number(raw.seats_taken),
    seatsTotal: Number(raw.seats_total ?? 3),
    stops: raw.stops,
  };
}

/** Le chauffeur active ou coupe la réception de covoiturages. */
export async function setSharedRides(client: TekoClient, enabled: boolean): Promise<boolean> {
  return unwrap(await client.rpc("set_shared_rides", { p_enabled: enabled }));
}

export interface ServiceAvailability {
  sharedRide: boolean;
  delivery: boolean;
}

/** Services ouverts par l'exploitation. Indicatif pour l'affichage : le
 *  serveur refuse de toute façon un devis d'un service fermé. */
export async function serviceAvailability(client: TekoClient): Promise<ServiceAvailability> {
  const raw = unwrap(await client.rpc("service_availability")) as unknown as {
    shared_ride?: boolean;
    delivery?: boolean;
  };
  return { sharedRide: raw.shared_ride === true, delivery: raw.delivery === true };
}
