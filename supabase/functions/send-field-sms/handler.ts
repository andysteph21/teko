// deno-lint-ignore no-import-prefix -- le runtime Edge utilise cette URL épinglée sans import map.
import { Webhook } from "npm:standardwebhooks@1.0.0";
import { json } from "../_shared/http.ts";

const endpoint = "https://sms.esmsafrica.io/api/messages/send";

interface Options {
  secret?: string;
  apiKey?: string;
  sender?: string;
  invited: (phone: string) => Promise<boolean>;
  send?: typeof fetch;
}

export function fieldSms(options: Options) {
  return async (request: Request) => {
    if (request.method !== "POST") {
      return json({ error: "Méthode non autorisée" }, 405);
    }
    const { secret, apiKey, sender } = options;
    if (
      !secret?.startsWith("v1,whsec_") ||
      !/^esms_live_[A-Za-z0-9_-]+$/.test(apiKey ?? "") || !sender
    ) {
      return json({ error: "SMS terrain indisponible" }, 503);
    }
    let phone: unknown;
    let otp: unknown;
    try {
      const body = await request.text();
      const event = new Webhook(secret.slice("v1,whsec_".length)).verify(
        body,
        Object.fromEntries(request.headers),
      ) as { user?: { phone?: unknown }; sms?: { otp?: unknown } };
      phone = event.user?.phone;
      otp = event.sms?.otp;
    } catch {
      return json({ error: "Signature invalide" }, 401);
    }
    if (
      typeof phone !== "string" || !/^\+?241\d{8,9}$/.test(phone) ||
      typeof otp !== "string" || !/^\d{6}$/.test(otp)
    ) {
      return json({ error: "Demande de code invalide" }, 400);
    }
    const digits = phone.replace(/^\+/, "");
    try {
      if (!(await options.invited(digits))) {
        return json({ error: "Invitation requise" }, 403);
      }
      const response = await (options.send ?? fetch)(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "idempotency-key": request.headers.get("webhook-id")!,
        },
        body: JSON.stringify({
          to: `+${digits}`,
          text: `Teko : code de connexion ${otp}. Ne partagez pas ce code.`,
          sender_id: sender,
        }),
        signal: AbortSignal.timeout(3500),
        redirect: "error",
      });
      if (response.ok && (await response.json())?.status === "submitted") {
        return json({});
      }
    } catch {
      // Ne jamais journaliser le corps du webhook, l'OTP ou la réponse du fournisseur.
    }
    return json({ error: "Envoi du SMS indisponible" }, 503);
  };
}
