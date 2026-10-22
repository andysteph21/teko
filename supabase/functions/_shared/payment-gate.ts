import { json } from "./http.ts";
import { authorizeWebhook } from "./webhook-auth.ts";

/** Alpha cash : seul un harnais de test privé peut exercer le provider mock. */
export async function paymentGate(req: Request): Promise<Response | null> {
  if (Deno.env.get("TEKO_PAYMENT_SANDBOX") !== "true" || Deno.env.get("PAYMENT_PROVIDER") !== "mock") {
    return json({ error: "Mobile Money désactivé pendant l’alpha" }, 503);
  }
  return await authorizeWebhook(req, Deno.env.get("TEKO_SANDBOX_SECRET"), "x-teko-sandbox-secret");
}
