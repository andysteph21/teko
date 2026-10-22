// Réception des callbacks Airtel : vérifie, retrouve le paiement par partner_txn_id,
// puis confirme/échoue via les RPC Postgres (source de vérité du solde).
import { admin } from "../_shared/db.ts";
import type { Db } from "../_shared/db_types.ts";
import { paymentGate } from "../_shared/payment-gate.ts";
import { handleCallback } from "./handler.ts";

Deno.serve(async (req) => {
  const rejected = await paymentGate(req);
  if (rejected) return rejected;
  return handleCallback(req, admin() as unknown as Db);
});
