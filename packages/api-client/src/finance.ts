// Solde quotidien & règlements (D-15/D-16) — le grand livre est append-only,
// seuls les RPC serveur écrivent. Ici : lecture du solde, intention de
// règlement (puis l'app invoque l'Edge Function airtel-collect).

import type { TableRow } from "@teko/types";
import type { TekoClient } from "./client";
import { mapApiError, unwrap } from "./errors";

/** Solde signé du chauffeur : < 0 = il doit à Teko (« Vous devez »). */
export async function driverBalance(client: TekoClient, driverId: string): Promise<number> {
  return Number(unwrap(await client.rpc("driver_balance", { p_driver: driverId })));
}

/** Intention de règlement Airtel du solde débiteur (D-16). Étape suivante :
 *  invoquer l'Edge Function `airtel-collect` avec l'id retourné. */
export async function createSettlementPayment(
  client: TekoClient,
  amountXaf: number,
): Promise<TableRow<"payments">> {
  return unwrap(
    await client.rpc("create_settlement_payment", { p_amount: amountXaf }),
  ) as TableRow<"payments">;
}

/** Déclenche l'encaissement USSD (Airtel) d'un paiement en attente. */
export async function invokeCollect(client: TekoClient, paymentId: string): Promise<void> {
  const { error } = await client.functions.invoke("airtel-collect", {
    body: { payment_id: paymentId },
  });
  if (error) throw mapApiError(error);
}

/** Statut d'un paiement (C-15/D-14b : la confirmation Airtel arrive en
 *  asynchrone — interroger, la table n'est pas dans la publication Realtime). */
export async function getPayment(
  client: TekoClient,
  paymentId: string,
): Promise<TableRow<"payments">> {
  return unwrap(await client.from("payments").select("*").eq("id", paymentId).single());
}

/** Écritures du grand livre du compte courant (détail de D-15), RLS-scopé. */
export async function listMyLedger(client: TekoClient, limit = 50): Promise<TableRow<"ledger">[]> {
  return unwrap(
    await client.from("ledger").select("*").order("created_at", { ascending: false }).limit(limit),
  );
}

/** Relevés quotidiens archivés (D-17), RLS-scopé. */
export async function listMyStatements(
  client: TekoClient,
  limit = 31,
): Promise<TableRow<"daily_statements">[]> {
  return unwrap(
    await client
      .from("daily_statements")
      .select("*")
      .order("business_day", { ascending: false })
      .limit(limit),
  );
}
