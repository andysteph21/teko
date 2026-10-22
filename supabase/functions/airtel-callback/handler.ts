import type { Db } from "../_shared/db_types.ts";
import { json } from "../_shared/http.ts";
import { getProvider, resolveOutcome, type MobileMoneyProvider } from "../_shared/payments/index.ts";

export async function handleCallback(req: Request, db: Db, provider: MobileMoneyProvider = getProvider()): Promise<Response> {
  try {
    const cb = await provider.verifyCallback(req.headers, await req.text());
    if (!cb.valid) return json({ error: "callback invalide" }, 401);
    if (!cb.partnerTxnId || !cb.status) return json({ error: "callback incomplet" }, 400);
    const { data: pmt, error: lookupError } = await db.from("payments").select("id,status").eq("partner_txn_id", cb.partnerTxnId).single();
    if (lookupError) return json({ error: "lecture paiement indisponible" }, 500);
    if (!pmt) return json({ error: "transaction inconnue" }, 404);
    if (pmt.status === "success") return json({ ok: true });
    const outcome = resolveOutcome(cb.status);
    if (outcome === "confirm" || outcome === "fail") {
      const { error } = await db.rpc(outcome === "confirm" ? "confirm_payment" : "fail_payment", {
        p_payment: pmt.id,
        ...(outcome === "fail" ? { p_reason: "callback failed" } : {}),
      });
      if (error) return json({ error: "transition paiement indisponible" }, 500);
    }
    return json({ ok: true });
  } catch {
    return json({ error: "traitement callback indisponible" }, 500);
  }
}
