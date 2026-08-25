// Fournisseur Airtel Money (REST/OAuth2). Voir docs/integrations/airtel-money-evaluation.md.
// NB : nécessite des identifiants/clés (secrets) ; activable via PAYMENT_PROVIDER=airtel.
// Durci hors sandbox (lot 6) : PIN chiffré RSA PKCS#1 v1.5, callbacks
// authentifiés (jeton + HMAC optionnelle), Enquiry par type de transaction.
// Restent À CONFIRMER en sandbox : le nom d'en-tête exact de la signature
// (Message Signing) et le comportement d'idempotence sur transaction.id rejoué.
import type {
  CallbackResult,
  CollectParams,
  DisburseParams,
  MobileMoneyProvider,
  TxnKind,
  TxnResult,
  TxnStatus,
} from "./provider.ts";
import { encryptPinForAirtel } from "./rsa.ts";

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

// Mappe les statuts Airtel -> statut interne (coder sur response_code, pas
// result_code — déprécié, éval. §6.8).
interface AirtelJson {
  data?: { transaction?: { status?: string; id?: string; airtel_money_id?: string } };
  status?: { success?: boolean };
}

function mapCollectStatus(j: AirtelJson): TxnStatus {
  const s = (j?.data?.transaction?.status ?? "").toUpperCase();
  if (s === "SUCCESS" || s === "TS" || j?.status?.success === true) return "success";
  if (s === "FAILED" || s === "TF") return "failed";
  if (s === "TA") return "ambiguous";
  return "pending";
}
function mapDisburseStatus(j: AirtelJson): TxnStatus {
  const s = (j?.data?.transaction?.status ?? "").toUpperCase();
  if (s === "TS") return "success";
  if (s === "TF") return "failed";
  if (s === "TA") return "ambiguous";
  return "pending"; // TIP
}

/** PIN de décaissement : soit déjà chiffré (secret AIRTEL_DISBURSE_PIN_ENC),
 *  soit chiffré ici à chaque appel (PIN clair + clé publique Airtel — le
 *  bourrage PKCS#1 v1.5 étant aléatoire, chaque chiffré est unique). */
export function disbursePin(): string {
  const pre = Deno.env.get("AIRTEL_DISBURSE_PIN_ENC");
  if (pre) return pre;
  return encryptPinForAirtel(env("AIRTEL_DISBURSE_PIN"), env("AIRTEL_RSA_PUBLIC_KEY"));
}

/** Comparaison sans fuite de temps ni de longueur : on compare les SHA-256. */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Callbacks « With Authentication » (éval. §6.6) — FERMÉ PAR DÉFAUT :
 *  sans AIRTEL_CALLBACK_TOKEN configuré, tout callback est rejeté.
 *  1) Authorization doit égaler le jeton configuré côté portail Airtel.
 *  2) Si AIRTEL_CALLBACK_HMAC_SECRET est posé : X-Signature doit être la
 *     HMAC-SHA256 (hex ou Base64) du corps brut — nom d'en-tête et format
 *     exacts À CONFIRMER en sandbox (Message Signing). */
export async function verifyAirtelCallback(
  headers: Headers,
  body: string,
): Promise<CallbackResult> {
  const expected = Deno.env.get("AIRTEL_CALLBACK_TOKEN");
  if (!expected) {
    console.error("AIRTEL_CALLBACK_TOKEN absent — callback rejeté (fermé par défaut)");
    return { valid: false };
  }
  const authorization = headers.get("authorization") ?? "";
  const bare = authorization.replace(/^(Bearer|Basic)\s+/i, "");
  if (!(await timingSafeEqual(authorization, expected)) && !(await timingSafeEqual(bare, expected))) {
    return { valid: false };
  }

  const hmacSecret = Deno.env.get("AIRTEL_CALLBACK_HMAC_SECRET");
  if (hmacSecret) {
    const signature = headers.get("x-signature") ?? headers.get("x-auth-signature") ?? "";
    const digestHex = await hmacHex(hmacSecret, body);
    const digestB64 = btoa(
      Array.from({ length: digestHex.length / 2 }, (_, i) =>
        String.fromCharCode(Number.parseInt(digestHex.slice(i * 2, i * 2 + 2), 16)),
      ).join(""),
    );
    const matches =
      (await timingSafeEqual(signature, digestHex)) || (await timingSafeEqual(signature, digestB64));
    if (!matches) return { valid: false };
  }

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
    const res = await fetch(`${base}/standard/v1/disbursements/`, {
      method: "POST",
      headers: commonHeaders(token),
      body: JSON.stringify({
        payee: { msisdn: p.msisdn },
        reference: p.reference,
        pin: disbursePin(),
        transaction: { amount: p.amount, id: p.partnerTxnId },
      }),
    });
    const j = await res.json();
    return { status: mapDisburseStatus(j), providerTxnId: j?.data?.transaction?.airtel_money_id, raw: j };
  }

  /** Enquiry sur le MÊME transaction.id avant tout retry (éval. §6.2 — jamais
   *  de nouvel id pour la même opération : c'est la parade au double payout). */
  async enquire(partnerTxnId: string, kind: TxnKind): Promise<TxnResult> {
    const base = env("AIRTEL_BASE_URL");
    const token = await getToken();
    const path = kind === "disburse"
      ? `/standard/v1/disbursements/${partnerTxnId}`
      : `/standard/v1/payments/${partnerTxnId}`;
    const res = await fetch(`${base}${path}`, { method: "GET", headers: commonHeaders(token) });
    const j = await res.json();
    const status = kind === "disburse" ? mapDisburseStatus(j) : mapCollectStatus(j);
    return { status, providerTxnId: j?.data?.transaction?.id, raw: j };
  }

  verifyCallback(headers: Headers, body: string): Promise<CallbackResult> {
    return verifyAirtelCallback(headers, body);
  }
}
