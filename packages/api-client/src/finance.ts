// Solde quotidien & règlements (D-15/D-16) — le grand livre est append-only,
// seuls les RPC serveur écrivent. Ici : lecture du solde, intention de
// règlement (puis l'app invoque l'Edge Function airtel-collect).

import type { TableRow } from "@teko/types";
import type { TekoClient } from "./client.js";
import { mapApiError, unwrap } from "./errors.js";

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

/** Écritures du grand livre du compte courant (détail de D-15), RLS-scopé. */
export async function listMyLedger(client: TekoClient, limit = 50): Promise<TableRow<"ledger">[]> {
  return unwrap(
    await client.from("ledger").select("*").order("at", { ascending: false }).limit(limit),
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
      .order("day", { ascending: false })
      .limit(limit),
  );
}
