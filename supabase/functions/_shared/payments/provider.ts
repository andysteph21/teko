// Abstraction "fournisseur de paiement mobile" — commune à Airtel (MVP) et Moov (futur).
// Les Edge Functions ne dépendent que de cette interface : ajouter Moov plus tard
// ne touchera pas la logique de solde (qui vit dans Postgres).

export type TxnStatus = "success" | "failed" | "pending" | "ambiguous";

export interface TxnResult {
  status: TxnStatus;
  providerTxnId?: string;
  raw?: unknown;
}

export interface CollectParams {
  msisdn: string;        // numéro du payeur (sans indicatif pays pour Airtel)
  amount: number;
  reference: string;
  partnerTxnId: string;  // clé d'idempotence (= partner_txn_id en base)
}

export type DisburseParams = CollectParams; // payee = msisdn

export interface CallbackResult {
  valid: boolean;
  partnerTxnId?: string;
  status?: TxnStatus;
}

/** Côté de la transaction — les chemins d'Enquiry diffèrent chez Airtel
 *  (collection vs disbursement) et les statuts ne se lisent pas pareil. */
export type TxnKind = "collect" | "disburse";

export interface MobileMoneyProvider {
  collect(p: CollectParams): Promise<TxnResult>;
  disburse(p: DisburseParams): Promise<TxnResult>;
  enquire(partnerTxnId: string, kind: TxnKind): Promise<TxnResult>;
  verifyCallback(headers: Headers, body: string): Promise<CallbackResult>;
}

// Décision de traitement à partir d'un statut renvoyé par le fournisseur.
// "retry" = laisser en attente, le job de réconciliation tranchera (jamais de double paiement).
export function resolveOutcome(status: TxnStatus): "confirm" | "fail" | "retry" {
  if (status === "success") return "confirm";
  if (status === "failed") return "fail";
  return "retry"; // pending | ambiguous
}
