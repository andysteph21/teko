// Réconciliation périodique : interroge le fournisseur pour les paiements non finalisés
// (pending/ambiguous/initiated) et confirme/échoue en conséquence. Idempotent.
import { admin, json } from "../_shared/db.ts";
import { getProvider, resolveOutcome } from "../_shared/payments/index.ts";

Deno.serve(async () => {
  try {
    const db = admin();
    const { data: list } = await db
      .from("payments")
      .select("id, partner_txn_id, status, kind")
      .in("status", ["pending", "ambiguous", "initiated"]);

    const provider = getProvider();
    let confirmed = 0, failed = 0, pending = 0;

    for (const pmt of list ?? []) {
      // Enquiry côté disbursement pour les payouts, côté collection sinon
      // (ride_collection, driver_settlement) — chemins distincts chez Airtel.
      const r = await provider.enquire(pmt.partner_txn_id, pmt.kind === "payout" ? "disburse" : "collect");
      const outcome = resolveOutcome(r.status);
      if (outcome === "confirm") { await db.rpc("confirm_payment", { p_payment: pmt.id }); confirmed++; }
      else if (outcome === "fail") { await db.rpc("fail_payment", { p_payment: pmt.id, p_reason: "reconcile" }); failed++; }
      else pending++;
    }

    return json({ confirmed, failed, pending });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
