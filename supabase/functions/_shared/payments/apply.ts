// Application de l'issue fournisseur à un paiement — SEUL point de contact
// entre les Edge Functions et le statut d'un paiement.
//
// RÈGLE FINANCE (régression vécue, sept. 2026) : ne JAMAIS écrire
// status='success'/'failed' directement depuis une fonction. Ces transitions
// appartiennent aux RPC confirm_payment / fail_payment, qui postent le grand
// livre et réactivent le chauffeur. Pré-positionner 'success' arme la garde
// d'idempotence de confirm_payment : écriture ledger jamais postée, chauffeur
// « payé mais toujours suspendu ».
import type { Db } from "../db_types.ts";
import { resolveOutcome, type TxnResult } from "./provider.ts";

export interface PaymentRef {
  id: string;
  provider_txn_id: string | null;
}

// Ligne payments telle que lue par les handlers (PostgREST sérialise les
// numériques en strings — d'où amount: number | string). La signature d'index
// reflète les colonnes non typées ici et permet le rétrécissement depuis DbRow.
export interface PaymentRow extends PaymentRef {
  [key: string]: unknown;
  kind: string;
  status: string;
  amount: number | string;
  partner_txn_id: string;
  driver_id: string | null;
  ride_id: string | null;
}

export async function applyOutcome(
  db: Db,
  pmt: PaymentRef,
  r: TxnResult,
  failReason: string,
): Promise<"confirm" | "fail" | "retry"> {
  // Trace fournisseur uniquement — jamais de statut final ici (cf. en-tête).
  await db.from("payments").update({
    provider_txn_id: r.providerTxnId ?? pmt.provider_txn_id,
    raw: r.raw ?? {},
  }).eq("id", pmt.id);

  const outcome = resolveOutcome(r.status);
  if (outcome === "confirm") {
    const { error } = await db.rpc("confirm_payment", { p_payment: pmt.id });
    if (error) throw new Error(`confirm_payment a échoué : ${error.message}`);
  } else if (outcome === "fail") {
    const { error } = await db.rpc("fail_payment", { p_payment: pmt.id, p_reason: failReason });
    if (error) throw new Error(`fail_payment a échoué : ${error.message}`);
  } else {
    // Push accepté, issue incertaine : payments-reconcile tranchera. Le garde
    // .neq('success') protège d'un callback concurrent qui aurait déjà confirmé
    // (sinon : retour à 'pending' → re-confirmation par reconcile → double crédit).
    await db.from("payments").update({ status: "pending" })
      .eq("id", pmt.id).neq("status", "success");
  }
  return outcome;
}
