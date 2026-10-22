// Déclenchement immédiat + rattrapage cron de la file serveur. Aucune donnée
// métier fournie dans le webhook n'est considérée comme source d'autorité.
import { admin, json } from "../_shared/db.ts";
import { getPushProvider } from "../_shared/push/index.ts";
import { authorizeWebhook } from "../_shared/webhook-auth.ts";
import { collectReceipts, deliverPending } from "./delivery.ts";

Deno.serve(async (req) => {
  const rejected = await authorizeWebhook(
    req,
    Deno.env.get("PUSH_TRIGGER_SECRET"),
    "x-teko-push-secret",
  );
  if (rejected) return rejected;
  try {
    const body = await req.json() as { notification_id?: string };
    if (
      body.notification_id && !/^[0-9a-f-]{36}$/i.test(body.notification_id)
    ) {
      return json({ error: "Identifiant de notification invalide" }, 400);
    }
    const provider = getPushProvider();
    const db = admin();
    const sent = await deliverPending(
      db,
      provider,
      body.notification_id ?? null,
    );
    if (provider.name === "expo" && !body.notification_id) {
      await collectReceipts(db);
    }
    return json({ sent, provider: provider.name });
  } catch {
    return json({ error: "Livraison push indisponible ; file conservée" }, 503);
  }
});
