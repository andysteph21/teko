// Décaissement (Teko -> chauffeur) pour un paiement 'payout' (créé par
// daily_close). Aucune mutation de solde ni de statut final ici : les
// transitions passent par applyOutcome (RPC Postgres) — même règle finance
// qu'airtel-collect. Module pur (client injecté par index.ts).
import type { Db } from "../_shared/db_types.ts";
import { json } from "../_shared/http.ts";
import { resolveMsisdn } from "../_shared/msisdn.ts";
import { applyOutcome, type PaymentRow } from "../_shared/payments/apply.ts";
import { getProvider } from "../_shared/payments/index.ts";

export async function handleDisburse(req: Request, db: Db): Promise<Response> {
  try {
    const { payment_id } = await req.json();
    if (!payment_id) return json({ error: "payment_id requis" }, 400);

    const { data } = await db.from("payments").select("*").eq("id", payment_id).single();
    const pmt = data as PaymentRow | null;
    if (!pmt) return json({ error: "paiement introuvable" }, 404);
    if (pmt.kind !== "payout") return json({ error: "type de paiement invalide" }, 400);
    if (pmt.status === "success") return json({ status: "success" }); // idempotent

    const msisdn = await resolveMsisdn(db, pmt);
    if (!msisdn) return json({ error: "MSISDN introuvable" }, 422);

    const r = await getProvider().disburse({
      msisdn, amount: Number(pmt.amount), reference: "payout", partnerTxnId: pmt.partner_txn_id,
    });
    await applyOutcome(db, pmt, r, "disburse failed");

    return json({ status: r.status });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
