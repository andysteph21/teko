// Lot R5 — livraison de colis, code et photo à la remise.
// Scénarios de référence : supabase/tests/e2e/livraison.test.ts.

import type { RideRow, TableRow } from "@teko/types";
import type { TekoClient } from "./client";
import { TekoApiError, unwrap } from "./errors";

export type ParcelSize = "small" | "medium" | "large";
export type RideParcel = TableRow<"ride_parcels">;
export interface ParcelInput {
  description: string;
  size: ParcelSize;
  recipientName: string;
  recipientPhone: string;
}

export const DELIVERY_PROOF_BUCKET = "delivery-proofs";

/** Chemin imposé par le serveur : la photo vit dans le dossier de la course. */
export function deliveryProofPath(rideId: string, fileName = "remise.jpg"): string {
  return `${rideId}/${fileName}`;
}

export async function requestDelivery(
  client: TekoClient,
  input: {
    quoteId: string;
    parcel: ParcelInput;
    originHint?: string;
    destinationHint?: string;
    originLandmarkId?: string;
    destinationLandmarkId?: string;
  },
): Promise<RideRow> {
  return unwrap(
    await client.rpc("request_delivery", {
      p_quote: input.quoteId,
      p_parcel: {
        description: input.parcel.description,
        size: input.parcel.size,
        recipient_name: input.parcel.recipientName,
        recipient_phone: input.parcel.recipientPhone,
      },
      ...(input.originHint ? { p_origin_hint: input.originHint } : {}),
      ...(input.destinationHint ? { p_dest_hint: input.destinationHint } : {}),
      ...(input.originLandmarkId ? { p_origin_landmark: input.originLandmarkId } : {}),
      ...(input.destinationLandmarkId ? { p_dest_landmark: input.destinationLandmarkId } : {}),
    }),
  );
}

/** Code de remise, lisible du seul expéditeur qui le transmet au destinataire. */
export async function deliveryCode(client: TekoClient, rideId: string): Promise<string> {
  return unwrap(await client.rpc("delivery_code", { p_ride: rideId }));
}

/** Colis d'une course : expéditeur, coursier affecté et opérations seulement. */
export async function getRideParcel(
  client: TekoClient,
  rideId: string,
): Promise<RideParcel | null> {
  const rows = unwrap(await client.from("ride_parcels").select("*").eq("ride_id", rideId).limit(1));
  return rows[0] ?? null;
}

export async function setDeliveryEnabled(client: TekoClient, enabled: boolean): Promise<boolean> {
  return unwrap(await client.rpc("set_delivery_enabled", { p_enabled: enabled }));
}

export async function uploadDeliveryProof(
  client: TekoClient,
  rideId: string,
  file: ArrayBuffer | Blob,
): Promise<string> {
  const path = deliveryProofPath(rideId, `remise-${Date.now()}.jpg`);
  const { error } = await client.storage
    .from(DELIVERY_PROOF_BUCKET)
    .upload(path, file, { contentType: "image/jpeg" });
  if (error) throw new TekoApiError("unknown", error.message, error);
  return path;
}

export type DeliveryOutcome =
  | { ok: true; ride: RideRow }
  | {
      ok: false;
      error: "code_incorrect" | "code_blocked";
      attemptsRemaining: number;
      retryAfterS: number;
    };

/** Remise : code du destinataire et photo déjà déposée. */
export async function completeDelivery(
  client: TekoClient,
  input: { rideId: string; code: string; photoPath: string },
): Promise<DeliveryOutcome> {
  const raw = unwrap(
    await client.rpc("complete_delivery", {
      p_ride: input.rideId,
      p_code: input.code,
      p_photo_path: input.photoPath,
    }),
  ) as unknown as {
    ride?: RideRow;
    error?: "code_incorrect" | "code_blocked";
    attempts_remaining?: number;
    retry_after_s?: number;
  };
  if (raw.ride) return { ok: true, ride: raw.ride };
  return {
    ok: false,
    error: raw.error ?? "code_incorrect",
    attemptsRemaining: Number(raw.attempts_remaining ?? 0),
    retryAfterS: Number(raw.retry_after_s ?? 0),
  };
}
