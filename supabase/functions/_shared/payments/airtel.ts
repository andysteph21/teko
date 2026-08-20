// Fournisseur Airtel Money (REST/OAuth2). Voir docs/integrations/airtel-money-evaluation.md.
// NB : nécessite des identifiants/clés (secrets) ; activable via PAYMENT_PROVIDER=airtel.
// Certains points (chiffrement RSA du PIN de décaissement, endpoint exact d'enquiry,
// schéma de signature des callbacks) sont marqués TODO à confirmer en sandbox.
import type {
  CallbackResult, CollectParams, DisburseParams, MobileMoneyProvider, TxnResult, TxnStatus,
} from "./provider.ts";

function env(k: string): string {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Variable d'environnement manquante: ${k}`);
  return v;
}

// Cache de token (Airtel : expire en ~180 s) partagé au niveau du module.
let tokenCache: { token: string; expMs: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expMs - 5000 > now) return tokenCache.token;
  const base = env("AIRTEL_BASE_URL");
  const res = await fetch(`${base}/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "*/*" },
    body: JSON.stringify({
      client_id: env("AIRTEL_CLIENT_ID"),
      client_secret: env("AIRTEL_CLIENT_SECRET"),
      grant_type: "client_credentials",
    }),
  });
  const j = await res.json();
  const ttl = Number(j.expires_in ?? 180);
  tokenCache = { token: j.access_token, expMs: now + ttl * 1000 };
  return tokenCache.token;
}

function commonHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    "Accept": "*/*",
    "X-Country": env("AIRTEL_X_COUNTRY"),   // ex. GA — À CONFIRMER (exemples doc ambigus)
    "X-Currency": env("AIRTEL_X_CURRENCY"), // ex. XAF — À CONFIRMER
    "Authorization": `Bearer ${token}`,
  };
}

// Mappe les statuts Airtel -> statut interne.
function mapCollectStatus(j: any): TxnStatus {
  const s = (j?.data?.transaction?.status ?? "").toUpperCase();
  if (s === "SUCCESS" || j?.status?.success === true) return "success";
  if (s === "FAILED") return "failed";
  return "pending";
}
function mapDisburseStatus(j: any): TxnStatus {
  const s = (j?.data?.transaction?.status ?? "").toUpperCase();
  if (s === "TS") return "success";
  if (s === "TF") return "failed";
  if (s === "TA") return "ambiguous";
  return "pending"; // TIP
}

export class AirtelProvider implements MobileMoneyProvider {
  async collect(p: CollectParams): Promise<TxnResult> {
    const base = env("AIRTEL_BASE_URL");
    const token = await getToken();
    const res = await fetch(`${base}/merchant/v1/payments/`, {
      method: "POST",
      headers: commonHeaders(token),
      body: JSON.stringify({
        reference: p.reference,
        subscriber: { msisdn: p.msisdn },
        transaction: { amount: p.amount, id: p.partnerTxnId },
      }),
    });
    const j = await res.json();
    return { status: mapCollectStatus(j), providerTxnId: j?.data?.transaction?.id, raw: j };
  }

  async disburse(p: DisburseParams): Promise<TxnResult> {
    const base = env("AIRTEL_BASE_URL");
    const token = await getToken();
    // TODO: chiffrer le PIN en RSA (voir docs/integrations + section Encryption Airtel).
    const pin = env("AIRTEL_DISBURSE_PIN_ENC"); // PIN déjà chiffré (RSA) côté secret store
    const res = await fetch(`${base}/standard/v1/disbursements/`, {
      method: "POST",
      headers: commonHeaders(token),
      body: JSON.stringify({
        payee: { msisdn: p.msisdn },
        reference: p.reference,
        pin,
        transaction: { amount: p.amount, id: p.partnerTxnId },
      }),
    });
    const j = await res.json();
    return { status: mapDisburseStatus(j), providerTxnId: j?.data?.transaction?.airtel_money_id, raw: j };
  }

  async enquire(partnerTxnId: string): Promise<TxnResult> {
    const base = env("AIRTEL_BASE_URL");
    const token = await getToken();
    // TODO: confirmer le chemin exact de Transaction Enquiry (collection vs disbursement).
    const res = await fetch(`${base}/standard/v1/payments/${partnerTxnId}`, {
      method: "GET",
      headers: commonHeaders(token),
    });
    const j = await res.json();
    return { status: mapCollectStatus(j), providerTxnId: j?.data?.transaction?.id, raw: j };
  }

  // deno-lint-ignore require-await
  async verifyCallback(_headers: Headers, body: string): Promise<CallbackResult> {
    // TODO: aligner sur "Callback With Authentication" + Message Signing d'Airtel.
    // Placeholder : on extrait l'id/statut ; la vérification de signature reste à implémenter.
    try {
      const j = JSON.parse(body);
      const s = (j?.transaction?.status_code ?? j?.status ?? "").toString().toUpperCase();
      const status: TxnStatus = s.includes("SUCCESS") || s === "TS" ? "success"
        : s.includes("FAIL") || s === "TF" ? "failed" : "pending";
      return { valid: true, partnerTxnId: j?.transaction?.id, status };
    } catch {
      return { valid: false };
    }
  }
}
