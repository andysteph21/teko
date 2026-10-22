import { beforeAll, afterAll, expect, it } from "vitest";
import { API_URL, db, createUser, serviceSql, type TestUser } from "./helpers";

let user: TestUser;
let superadmin: TestUser;
beforeAll(async () => { user = await createUser(); superadmin = await createUser({ role: "admin", adminRole: "superadmin" }); });
afterAll(async () => { await db.end(); });

it("le push refuse les appels sans secret partagé", async () => {
  const r = await fetch(`${API_URL}/functions/v1/notify-push`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: user.id, type: "ride_offer", payload: {} }),
  });
  expect([401, 503]).toContain(r.status);
});

it("la purge refuse les appels sans secret partagé", async () => {
  const r = await fetch(`${API_URL}/functions/v1/account-purge`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  expect([401, 503]).toContain(r.status);
});

it("les secrets de webhook ne sont pas lisibles via app_config", async () => {
  const keys = ["push_webhook_secret", "purge_webhook_secret"];
  const previous = await serviceSql("select key,value from public.app_config where key=any($1)", [keys]);
  try {
    await serviceSql("update public.app_config set value=to_jsonb('audit-secret-sentinel'::text) where key=any($1)", [keys]);
    const r = await user.client.from("app_config").select("key,value").in("key", keys);
    expect(r.error).toBeNull();
    expect(r.data).toEqual([]);
    const history = await superadmin.client.from("app_config_history").select("key,old_value,new_value").in("key", keys);
    expect(history.error).toBeNull();
    expect(history.data).toEqual([]);
    const rawHistory = await serviceSql("select old_value,new_value from public.app_config_history where key=any($1)", [keys]);
    expect(rawHistory.rows.every((row) => row.old_value == null && row.new_value == null)).toBe(true);
  } finally {
    for (const row of previous.rows) {
      await serviceSql("update public.app_config set value=$2::jsonb where key=$1", [row.key, JSON.stringify(row.value)]);
    }
  }
});
