// Réconciliation périodique : interroge le fournisseur pour les paiements non
// finalisés (pending/ambiguous/initiated) et confirme/échoue en conséquence.
// Idempotent. Les transitions passent par applyOutcome (RPC uniquement — même
// règle finance qu'airtel-collect) ; une erreur RPC sur un paiement n'arrête
// pas la boucle, le passage suivant retentera.
import { admin, json } from "../_shared/db.ts";
import type { Db } from "../_shared/db_types.ts";
import { applyOutcome, type PaymentRow } from "../_shared/payments/apply.ts";
import { getProvider } from "../_shared/payments/index.ts";
import { paymentGate } from "../_shared/payment-gate.ts";

Deno.serve(async (req) => {
  const rejected = await paymentGate(req);
  if (rejected) return rejected;
  try {
    // Client complet pour la requête de liste ; surface Db pour les transitions.
    const full = admin();
    const db = full as unknown as Db;
    const { data: list } = await full
      .from("payments")
      .select("id, partner_txn_id, provider_txn_id, status, kind")
      .in("status", ["pending", "ambiguous", "initiated"]);

    const provider = getProvider();
    let confirmed = 0, failed = 0, pending = 0, errors = 0;

    for (const pmt of (list ?? []) as PaymentRow[]) {
      // Enquiry côté disbursement pour les payouts, côté collection sinon
      // (ride_collection, driver_settlement) — chemins distincts chez Airtel.
      const r = await provider.enquire(pmt.partner_txn_id, pmt.kind === "payout" ? "disburse" : "collect");
      try {
        const outcome = await applyOutcome(db, pmt, r, "reconcile");
        if (outcome === "confirm") confirmed++;
        else if (outcome === "fail") failed++;
        else pending++;
      } catch (_e) {
        errors++;
      }
    }

    return json({ confirmed, failed, pending, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
