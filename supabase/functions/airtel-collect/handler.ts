// Encaissement mobile (client -> Teko, ou règlement chauffeur -> Teko).
// Initie un USSD Push ; le statut final arrive via callback (airtel-callback)
// ou est rattrapé par payments-reconcile. Aucune mutation de solde ni de
// statut final ici : les transitions passent par applyOutcome (RPC Postgres).
// Module pur (client injecté par index.ts) — testable sans base.
import type { Db } from "../_shared/db_types.ts";
import { json } from "../_shared/http.ts";
import { resolveMsisdn } from "../_shared/msisdn.ts";
import { applyOutcome, type PaymentRow } from "../_shared/payments/apply.ts";
import { getProvider } from "../_shared/payments/index.ts";

export async function handleCollect(req: Request, db: Db): Promise<Response> {
  try {
    const { payment_id } = await req.json();
    if (!payment_id) return json({ error: "payment_id requis" }, 400);

    const { data } = await db.from("payments").select("*").eq("id", payment_id).single();
    const pmt = data as PaymentRow | null;
    if (!pmt) return json({ error: "paiement introuvable" }, 404);
    if (pmt.status === "success") return json({ status: "success" }); // idempotent

    const msisdn = await resolveMsisdn(db, pmt);
    if (!msisdn) return json({ error: "MSISDN introuvable" }, 422);

    const r = await getProvider().collect({
      msisdn, amount: Number(pmt.amount), reference: pmt.kind, partnerTxnId: pmt.partner_txn_id,
    });
    await applyOutcome(db, pmt, r, "collect failed");

    return json({ status: r.status });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
