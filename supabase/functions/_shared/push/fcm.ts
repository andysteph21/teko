// Fournisseur FCM HTTP v1 — compte de service Google (env FCM_SERVICE_ACCOUNT,
// JSON complet). Jeton OAuth signé RS256 via WebCrypto, mis en cache ~50 min.

import type { PushMessage, PushProvider, PushResult } from "./provider.ts";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function base64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string"
    ? new TextEncoder().encode(data)
    : data;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll(
    "=",
    "",
  );
}

function importKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replaceAll("\\n", "")
    .replaceAll("\n", "");
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await importKey(sa.private_key);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${claims}`),
    ),
  );
  const assertion = `${header}.${claims}.${base64url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`OAuth Google: ${response.status}`);
  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

export function fcmProvider(serviceAccountJson: string): PushProvider {
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  return {
    name: "fcm",
    async send(message: PushMessage): Promise<PushResult> {
      const token = await accessToken(sa);
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: message.token,
              notification: { title: message.title, body: message.body },
              data: message.data,
              android: {
                priority: "HIGH",
                ...(message.ttl ? { ttl: message.ttl } : {}),
              },
            },
          }),
        },
      );
      if (response.ok) return { ok: true };
      const detail = await response.text();
      // UNREGISTERED / INVALID_ARGUMENT sur le jeton → purger l'appareil.
      const invalidToken = response.status === 404 ||
        detail.includes("UNREGISTERED");
      return {
        ok: false,
        invalidToken,
        detail: `${response.status} ${detail.slice(0, 200)}`,
      };
    },
  };
}
