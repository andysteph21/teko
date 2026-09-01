// Désactivation auth des comptes purgés (webhook pg_net posé par la migration
// 20260902100000 : fin de purge_deleted_accounts + rattrapage pg_cron 02:45).
// Authentifie le déclencheur (secret partagé), liste les comptes purgés côté
// métier dont l'identité GoTrue vit encore, puis les soft-delete via l'API
// admin : deleted_at posé, numéro/e-mail obfusqués (le numéro redevient
// libre), sessions et refresh tokens révoqués. Idempotent.

import { admin, json } from "../_shared/db.ts";
import { purgeAuthAccounts } from "../_shared/purge/handler.ts";

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("PURGE_TRIGGER_SECRET") ?? "";
    if (secret && req.headers.get("x-teko-purge-secret") !== secret) {
      return json({ error: "secret invalide" }, 401);
    }

    const db = admin();
    const result = await purgeAuthAccounts({
      listPending: async () => {
        const { data, error } = await db.rpc("pending_auth_purges");
        if (error) throw new Error(error.message);
        return (data ?? []) as string[];
      },
      deactivate: async (userId) => {
        const { error } = await db.auth.admin.deleteUser(userId, true);
        return error ? error.message : null;
      },
    });
    if (result.failed.length > 0) console.error("account-purge : échecs", result.failed);
    return json(result);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
