// Fournisseur simulé : déterministe, piloté par le partnerTxnId.
// Utilisé pour les tests et le développement local (PAYMENT_PROVIDER=mock).
import type {
  CallbackResult, CollectParams, DisburseParams, MobileMoneyProvider, TxnResult, TxnStatus,
} from "./provider.ts";

function outcomeFor(partnerTxnId: string): TxnStatus {
  if (partnerTxnId.includes("fail")) return "failed";
  if (partnerTxnId.includes("pending")) return "pending";
  if (partnerTxnId.includes("ambig")) return "ambiguous";
  return "success";
}

function result(partnerTxnId: string): TxnResult {
  return { status: outcomeFor(partnerTxnId), providerTxnId: "MOCK-" + partnerTxnId, raw: { mock: true } };
}

export class MockProvider implements MobileMoneyProvider {
  collect(p: CollectParams): Promise<TxnResult> { return Promise.resolve(result(p.partnerTxnId)); }
  disburse(p: DisburseParams): Promise<TxnResult> { return Promise.resolve(result(p.partnerTxnId)); }
  enquire(partnerTxnId: string): Promise<TxnResult> { return Promise.resolve(result(partnerTxnId)); }
  verifyCallback(_headers: Headers, body: string): Promise<CallbackResult> {
    try {
      const j = JSON.parse(body);
      return Promise.resolve({ valid: true, partnerTxnId: j.partnerTxnId, status: j.status as TxnStatus });
    } catch {
      return Promise.resolve({ valid: false });
    }
  }
}
