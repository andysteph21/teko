// Cycle de vie de la course — enveloppes typées des RPC backend.
// Avant de toucher un flux : lire son test dans supabase/tests/e2e/ (la
// documentation vivante des appels, règle du 06-demarrage §4).

import { ewktPoint, type LonLat } from "@teko/maps";
import type { PaymentMethod, RideRow, RideStatus, TableRow, VehicleCategory } from "@teko/types";
import type { TekoClient } from "./client";
import { unwrap } from "./errors";

export interface EstimatePriceInput {
  category: VehicleCategory;
  distanceM: number;
  durationS: number;
  zoneId?: string;
}

/** Estimation AFFICHÉE (C-10) — le prix qui fait foi est celui du backend. */
export async function estimatePrice(
  client: TekoClient,
  input: EstimatePriceInput,
): Promise<number> {
  const data = unwrap(
    await client.rpc("estimate_price", {
      p_category: input.category,
      p_distance_m: input.distanceM,
      p_duration_s: input.durationS,
      ...(input.zoneId ? { p_zone: input.zoneId } : {}),
    }),
  );
  // supabase-js sérialise les numeric Postgres en chaînes.
  return Number(data);
}

export interface RequestRideInput {
  category: VehicleCategory;
  origin: LonLat;
  destination: LonLat;
  distanceM: number;
  durationS: number;
  paymentMethod?: PaymentMethod;
  /** Course planifiée (C-18) — ISO 8601 ; absent = course immédiate. */
  scheduledAt?: string;
  originLandmarkId?: string;
  destinationLandmarkId?: string;
  /** Indication libre C-09 (« derrière le portail bleu ») — voyage jusqu'à D-11. */
  originHint?: string;
  destinationHint?: string;
}

export async function requestRide(client: TekoClient, input: RequestRideInput): Promise<RideRow> {
  return unwrap(
    await client.rpc("request_ride", {
      p_category: input.category,
      p_origin: ewktPoint(input.origin),
      p_dest: ewktPoint(input.destination),
      p_distance_m: input.distanceM,
      p_duration_s: input.durationS,
      ...(input.paymentMethod ? { p_payment_method: input.paymentMethod } : {}),
      ...(input.scheduledAt ? { p_scheduled_at: input.scheduledAt } : {}),
      ...(input.originLandmarkId ? { p_origin_landmark: input.originLandmarkId } : {}),
      ...(input.destinationLandmarkId ? { p_dest_landmark: input.destinationLandmarkId } : {}),
      ...(input.originHint ? { p_origin_hint: input.originHint } : {}),
      ...(input.destinationHint ? { p_dest_hint: input.destinationHint } : {}),
    }),
  ) as RideRow;
}

/** Annulation — gratuite avant attribution ; après, le backend applique les
 *  frais et les affiche via la notification `cancellation_fee` (C-21). */
export async function cancelRide(
  client: TekoClient,
  rideId: string,
  reason?: string,
): Promise<RideRow> {
  return unwrap(
    await client.rpc("cancel_ride", {
      p_ride: rideId,
      ...(reason ? { p_reason: reason } : {}),
    }),
  ) as RideRow;
}

/** Chauffeur : « Je suis arrivé » (D-11 → D-11b). */
export async function markArrived(client: TekoClient, rideId: string): Promise<RideRow> {
  return unwrap(await client.rpc("mark_arrived", { p_ride: rideId })) as RideRow;
}

/** Chauffeur : saisie du PIN communiqué de vive voix (D-12). */
export async function startRide(client: TekoClient, rideId: string, pin: string): Promise<RideRow> {
  return unwrap(await client.rpc("start_ride", { p_ride: rideId, p_pin: pin })) as RideRow;
}

/** Chauffeur : fin de course (D-13 → D-14) — le backend calcule le prix
 *  final et impacte le solde selon le mode de paiement. */
export async function completeRide(
  client: TekoClient,
  rideId: string,
  priceFinal?: number,
): Promise<RideRow> {
  return unwrap(
    await client.rpc("complete_ride", {
      p_ride: rideId,
      ...(priceFinal !== undefined ? { p_price_final: priceFinal } : {}),
    }),
  ) as RideRow;
}

export interface RateRideInput {
  rideId: string;
  fromUser: string;
  toUser: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

/** Note 1–5 mutuelle (C-16 / D-14) — insertion directe sous RLS, une note
 *  par (course, auteur). */
export async function rateRide(
  client: TekoClient,
  input: RateRideInput,
): Promise<TableRow<"ratings">> {
  return unwrap(
    await client
      .from("ratings")
      .insert({
        ride_id: input.rideId,
        from_user: input.fromUser,
        to_user: input.toUser,
        stars: input.stars,
        ...(input.comment ? { comment: input.comment } : {}),
      })
      .select()
      .single(),
  );
}

/** Une course par id (participant sous RLS) — PIN visible côté client. */
export async function getRide(client: TekoClient, rideId: string): Promise<RideRow> {
  return unwrap(await client.from("rides").select("*").eq("id", rideId).single());
}

/** Statuts d'une course « en cours » (routage C-01 : jamais l'accueil vide
 *  si une course est active côté serveur). */
export const ACTIVE_RIDE_STATUSES: RideStatus[] = [
  "requested",
  "accepted",
  "enroute",
  "arrived",
  "started",
];

/** Dernière course active du compte, ou null. */
export async function findActiveRide(client: TekoClient): Promise<RideRow | null> {
  const rows = unwrap(
    await client
      .from("rides")
      .select("*")
      .in("status", ACTIVE_RIDE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1),
  );
  return rows[0] ?? null;
}

/** Historique des courses du compte courant (C-19 / D-20), RLS-scopé. */
export async function listMyRides(client: TekoClient, limit = 30): Promise<RideRow[]> {
  return unwrap(
    await client.from("rides").select("*").order("created_at", { ascending: false }).limit(limit),
  );
}
