// Dispatch chauffeur : présence, offres (destination JAMAIS visible avant
// acceptation — anti-écrémage, décision n° 9), réponse dans les 12 s.

import { ewktPoint, type GeomInput, type LonLat, roundPosition, toLonLat } from "@teko/maps";
import type { PaymentMethod, RideRow, TableRow, VehicleCategory } from "@teko/types";
import type { TekoClient } from "./client.js";
import { unwrap } from "./errors.js";

/** Toggle « en ligne » (D-09) — à rappeler périodiquement : la présence
 *  expire après `presence_ttl_s` (300 s). Position arrondie (sobriété). */
export async function driverHeartbeat(
  client: TekoClient,
  position: LonLat,
  options: { eco?: boolean } = {},
): Promise<void> {
  unwrap(
    await client.rpc("driver_heartbeat", {
      p_point: ewktPoint(roundPosition(position, options.eco ?? false)),
    }),
  );
}

/** Charge du modal D-10 — commission et net affichés, destination absente. */
export interface OfferDetails {
  offerId: string;
  status: string;
  expiresAt: string;
  category: VehicleCategory;
  origin: LonLat;
  originLandmark: string | null;
  originHint: string | null;
  meetingLandmark: string | null;
  distanceEstM: number;
  durationEstS: number;
  priceEst: number;
  commission: number;
  netDriver: number;
  paymentMethod: PaymentMethod;
}

interface OfferDetailsPayload {
  offer_id: string;
  status: string;
  expires_at: string;
  category: VehicleCategory;
  origin: GeomInput;
  origin_landmark: string | null;
  origin_hint: string | null;
  meeting_landmark: string | null;
  distance_est_m: number;
  duration_est_s: number;
  price_est: number | string;
  commission: number | string;
  net_driver: number | string;
  payment_method: PaymentMethod;
}

export async function offerDetails(client: TekoClient, offerId: string): Promise<OfferDetails> {
  const raw = unwrap(
    await client.rpc("offer_details", { p_offer: offerId }),
  ) as unknown as OfferDetailsPayload;
  return {
    offerId: raw.offer_id,
    status: raw.status,
    expiresAt: raw.expires_at,
    category: raw.category,
    origin: toLonLat(raw.origin),
    originLandmark: raw.origin_landmark,
    originHint: raw.origin_hint,
    meetingLandmark: raw.meeting_landmark,
    distanceEstM: raw.distance_est_m,
    durationEstS: raw.duration_est_s,
    priceEst: Number(raw.price_est),
    commission: Number(raw.commission),
    netDriver: Number(raw.net_driver),
    paymentMethod: raw.payment_method,
  };
}

/** Accepter/refuser l'offre — refus ou silence : cascade au suivant,
 *  invisible côté client. Retourne la course si acceptée, null sinon. */
export async function respondOffer(
  client: TekoClient,
  offerId: string,
  accept: boolean,
): Promise<RideRow | null> {
  return unwrap(
    await client.rpc("respond_offer", { p_offer: offerId, p_accept: accept }),
  ) as RideRow | null;
}

/** Offres en attente du chauffeur courant (RLS-scopé). Repli d'interrogation
 *  tant que la livraison push (FCM) n'est pas branchée — cf. doc 10 §1
 *  (extensions backend autorisées). */
export async function listPendingOffers(client: TekoClient): Promise<TableRow<"ride_offers">[]> {
  return unwrap(
    await client
      .from("ride_offers")
      .select("*")
      .eq("status", "pending")
      .order("offered_at", { ascending: false }),
  );
}
