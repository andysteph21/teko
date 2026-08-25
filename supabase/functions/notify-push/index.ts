// Livraison push d'une notification (webhook pg_net posé par la migration
// 20260825130000) : authentifie le déclencheur (secret partagé), résout les
// appareils du destinataire, envoie via le fournisseur (FCM/mock), purge les
// jetons invalides. Meilleur-effort : jamais d'erreur bloquante côté métier.

import { admin, json } from "../_shared/db.ts";
import { getPushProvider, messageForType } from "../_shared/push/index.ts";

interface WebhookBody {
  notification_id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("PUSH_TRIGGER_SECRET") ?? "";
    if (secret && req.headers.get("x-teko-push-secret") !== secret) {
      return json({ error: "secret invalide" }, 401);
    }

    const body = (await req.json()) as WebhookBody;
    if (!body.user_id || !body.type) return json({ error: "user_id et type requis" }, 400);

    const db = admin();
    const { data: devices } = await db
      .from("devices")
      .select("id, push_token")
      .eq("user_id", body.user_id);
    if (!devices || devices.length === 0) return json({ sent: 0, reason: "aucun appareil" });

    const provider = getPushProvider();
    const { title, body: text, ttl } = messageForType(body.type, body.payload ?? {});
    let sent = 0;
    for (const device of devices) {
      const result = await provider.send({
        token: device.push_token,
        title,
        body: text,
        data: {
          type: body.type,
          notification_id: String(body.notification_id ?? ""),
          payload: JSON.stringify(body.payload ?? {}),
        },
        ...(ttl ? { ttl } : {}),
      });
      if (result.ok) sent += 1;
      else if (result.invalidToken) {
        await db.from("devices").delete().eq("id", device.id);
      }
    }
    return json({ sent, provider: provider.name });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
