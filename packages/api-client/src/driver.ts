// Côté chauffeur : dossier KYC (G, D-04→D-08), véhicule, consentement GPS.
// La VALIDATION est admin (validate_kyc) ; ici : constitution du dossier.

import type { DbEnum, TableRow, VehicleCategory } from "@teko/types";
import type { TekoClient } from "./client";
import { mapApiError, unwrap } from "./errors";

/** Auto-inscription chauffeur (autorisée par RLS) — statut pending. */
export async function createDriverProfile(
  client: TekoClient,
  userId: string,
  categories: VehicleCategory[],
): Promise<void> {
  unwrap(await client.from("drivers").upsert({ id: userId, categories }, { onConflict: "id" }));
}

/** Fiche chauffeur du compte (statut KYC, activité, consentement GPS). */
export async function getMyDriver(
  client: TekoClient,
  userId: string,
): Promise<TableRow<"drivers"> | null> {
  const rows = unwrap(await client.from("drivers").select("*").eq("id", userId).limit(1));
  return rows[0] ?? null;
}

/** Pièces du dossier avec statut et motif de refus (D-05/D-08/D-08b). */
export async function listMyDocuments(
  client: TekoClient,
): Promise<TableRow<"driver_documents">[]> {
  return unwrap(
    await client.from("driver_documents").select("*").order("created_at", { ascending: false }),
  );
}

/** Téléverse une pièce dans le bucket privé `kyc` (chemin <uid>/<type>-…)
 *  puis enregistre la ligne dossier. Remplace la pièce précédente du même
 *  type (D-08b : remplacement ciblé). */
export async function uploadKycDocument(
  client: TekoClient,
  input: {
    userId: string;
    type: DbEnum<"document_type">;
    data: ArrayBuffer;
    contentType: string;
  },
): Promise<TableRow<"driver_documents">> {
  const extension = input.contentType.includes("png") ? "png" : "jpg";
  const path = `${input.userId}/${input.type}.${extension}`;
  const { error: uploadError } = await client.storage
    .from("kyc")
    .upload(path, input.data, { contentType: input.contentType, upsert: true });
  if (uploadError) throw mapApiError(uploadError);
  return unwrap(
    await client
      .from("driver_documents")
      .insert({ driver_id: input.userId, type: input.type, storage_path: path })
      .select()
      .single(),
  );
}

/** Véhicule du chauffeur (D-06) — plaque + catégorie. */
export async function upsertVehicle(
  client: TekoClient,
  input: { driverId: string; category: VehicleCategory; plate: string },
): Promise<TableRow<"vehicles">> {
  return unwrap(
    await client
      .from("vehicles")
      .insert({ driver_id: input.driverId, category: input.category, plate: input.plate })
      .select()
      .single(),
  );
}

/** Numéro de versement Airtel (D-07/D-18) — les payouts le préfèrent. */
export async function setPayoutMsisdn(
  client: TekoClient,
  userId: string,
  msisdn: string,
): Promise<void> {
  unwrap(await client.from("drivers").update({ payout_msisdn: msisdn }).eq("id", userId));
}

/** Consentement GPS explicite (D-19, exigence produit). */
export async function setGpsConsent(
  client: TekoClient,
  userId: string,
  consent: boolean,
): Promise<void> {
  unwrap(await client.from("drivers").update({ gps_consent: consent }).eq("id", userId));
}
