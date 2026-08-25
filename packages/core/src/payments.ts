// Abstraction paiement mobile (ADR-06, docs/architecture/03-module-paiements §2) :
// les TYPES vivent ici (partagés apps/serveur) ; les IMPLÉMENTATIONS vivent
// exclusivement dans supabase/functions (Airtel aujourd'hui, Moov demain).

export type MobileMoneyRail = "airtel" | "moov";

export type PaymentOutcomeStatus = "pending" | "confirmed" | "failed";

export interface PaymentOutcome {
  status: PaymentOutcomeStatus;
  /** Motif d'échec ou d'ambiguïté (statut TA → file de réconciliation A-05). */
  reason?: string;
  /** Référence de transaction côté opérateur, quand elle existe. */
  operatorRef?: string;
}

export interface CollectRequest {
  paymentId: string;
  msisdn: string;
  amountXaf: number;
}

export interface DisburseRequest {
  paymentId: string;
  msisdn: string;
  amountXaf: number;
}

/** Contrat commun des rails mobile money — collect (USSD push), disburse
 *  (versement), enquire (levée d'ambiguïté). Les callbacks signés sont
 *  traités côté serveur uniquement. */
export interface MobileMoneyProvider {
  readonly rail: MobileMoneyRail;
  collect(request: CollectRequest): Promise<PaymentOutcome>;
  disburse(request: DisburseRequest): Promise<PaymentOutcome>;
  enquire(partnerTxnId: string): Promise<PaymentOutcome>;
}
