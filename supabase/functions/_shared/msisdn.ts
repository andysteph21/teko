// Récupère le MSISDN concerné par un paiement (payeur côté collecte,
// bénéficiaire côté payout). Module pur : typé sur la surface Db pour rester
// testable sans base ni supabase-js.
import type { Db } from "./db_types.ts";

interface PaymentLike {
  kind: string;
  ride_id?: string | null;
  driver_id?: string | null;
}

export async function resolveMsisdn(db: Db, pmt: PaymentLike): Promise<string | null> {
  let userId: string | null = null;
  if (pmt.kind === "ride_collection" && pmt.ride_id) {
    const { data } = await db.from("rides").select("client_id").eq("id", pmt.ride_id).single();
    userId = (data?.client_id as string | undefined) ?? null;
  } else {
    userId = pmt.driver_id ?? null;
  }
  if (!userId) return null;
  // Versement : le numéro Airtel dédié du chauffeur (D-07) prime.
  if (pmt.kind === "payout" || pmt.kind === "driver_settlement") {
    const { data: driver } = await db
      .from("drivers")
      .select("payout_msisdn")
      .eq("id", userId)
      .single();
    if (driver?.payout_msisdn) return driver.payout_msisdn as string;
  }
  const { data } = await db.from("profiles").select("phone").eq("id", userId).single();
  // TODO: formater le MSISDN sans indicatif pays selon l'exigence Airtel.
  return (data?.phone as string | undefined) ?? null;
}
