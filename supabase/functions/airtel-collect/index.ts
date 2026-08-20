// Encaissement mobile (client -> Teko, ou règlement chauffeur -> Teko).
// Initie un USSD Push ; le statut final arrive via callback (airtel-callback) ou
// est rattrapé par payments-reconcile. Aucune mutation de solde ici.
import { admin, json, resolveMsisdn } from "../_shared/db.ts";
import { getProvider, resolveOutcome } from "../_shared/payments/index.ts";

Deno.serve(async (req) => {
  try {
    const { payment_id } = await req.json();
    if (!payment_id) return json({ error: "payment_id requis" }, 400);

    const db = admin();
    const { data: pmt } = await db.from("payments").select("*").eq("id", payment_id).single();
    if (!pmt) return json({ error: "paiement introuvable" }, 404);
    if (pmt.status === "success") return json({ status: "success" }); // idempotent

    const msisdn = await resolveMsisdn(db, pmt);
    if (!msisdn) return json({ error: "MSISDN introuvable" }, 422);

    const r = await getProvider().collect({
      msisdn, amount: Number(pmt.amount), reference: pmt.kind, partnerTxnId: pmt.partner_txn_id,
    });

    const outcome = resolveOutcome(r.status);
    await db.from("payments").update({
      provider_txn_id: r.providerTxnId ?? pmt.provider_txn_id,
      status: outcome === "confirm" ? "success" : outcome === "fail" ? "failed" : "pending",
      raw: r.raw ?? {},
    }).eq("id", pmt.id);

    if (outcome === "confirm") await db.rpc("confirm_payment", { p_payment: pmt.id });
    else if (outcome === "fail") await db.rpc("fail_payment", { p_payment: pmt.id, p_reason: "collect failed" });

    return json({ status: r.status });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
