// Réception des callbacks Airtel : vérifie, retrouve le paiement par partner_txn_id,
// puis confirme/échoue via les RPC Postgres (source de vérité du solde).
import { admin, json } from "../_shared/db.ts";
import { getProvider, resolveOutcome } from "../_shared/payments/index.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const cb = await getProvider().verifyCallback(req.headers, body);
    if (!cb.valid) return json({ error: "callback invalide" }, 401);
    if (!cb.partnerTxnId || !cb.status) return json({ error: "callback incomplet" }, 400);

    const db = admin();
    const { data: pmt } = await db.from("payments").select("id,status").eq("partner_txn_id", cb.partnerTxnId).single();
    if (!pmt) return json({ error: "transaction inconnue" }, 404);
    if (pmt.status === "success") return json({ ok: true }); // idempotent

    const outcome = resolveOutcome(cb.status);
    if (outcome === "confirm") await db.rpc("confirm_payment", { p_payment: pmt.id });
    else if (outcome === "fail") await db.rpc("fail_payment", { p_payment: pmt.id, p_reason: "callback failed" });
    // "retry" : on laisse en attente, payments-reconcile tranchera.

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
