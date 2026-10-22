import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { admin, createUser, db, serviceSql, type TestUser } from "./helpers";

let first: TestUser;
let second: TestUser;
const token = () => `ExpoPushToken[${randomUUID()}]`;
async function register(user: TestUser, value: string) {
  const result = await user.client.rpc("register_push_device", { p_user: user.id, p_token: value, p_platform: "android" });
  expect(result.error).toBeNull();
}
async function notify(user: TestUser, payload: object = {}, type = "ride_completed") {
  const rows = await serviceSql("insert into public.notifications(user_id,type,payload) values($1,$2,$3::jsonb) returning id", [user.id, type, JSON.stringify(payload)]);
  return rows.rows[0].id as string;
}
beforeAll(async () => { first = await createUser(); second = await createUser(); });
afterAll(async () => { await db.end(); });

it("un jeton transféré ne laisse ni ancien destinataire ni suppression par l'ancienne session", async () => {
  const value = token();
  await register(first, value);
  const notification = await notify(first);
  await register(second, value);
  expect((await first.client.from("devices").select("id").eq("push_token", value)).data).toEqual([]);
  expect((await first.client.rpc("unregister_session_devices")).error).toBeNull();
  expect((await second.client.from("devices").select("id").eq("push_token", value)).data).toHaveLength(1);
  const pending = await admin.rpc("claim_push_deliveries", { p_notification: notification });
  expect(pending.error).toBeNull();
  expect(pending.data).toEqual([]);
  expect((await second.client.rpc("unregister_session_devices")).error).toBeNull();
  expect((await second.client.from("devices").select("id").eq("push_token", value)).data).toEqual([]);
});

it("le client ne peut imposer un autre propriétaire ni écrire directement les appareils", async () => {
  const value = token();
  const spoof = await first.client.rpc("register_push_device", { p_user: second.id, p_token: value, p_platform: "ios" });
  expect(spoof.error?.code).toBe("42501");
  const direct = await first.client.from("devices").insert({ user_id: first.id, push_token: value, platform: "android" });
  expect(direct.error?.code).toBe("42501");
  const invalid = await first.client.rpc("register_push_device", { p_user: first.id, p_token: "native-fcm-token", p_platform: "android" });
  expect(invalid.error?.code).toBe("22023");
});

it("deux workers concurrents ne prennent pas le même envoi, la file est privée", async () => {
  await register(first, token());
  const notification = await notify(first);
  const claims = await Promise.all([1, 2].map(() => admin.rpc("claim_push_deliveries", { p_notification: notification })));
  expect(claims.every((result) => result.error === null)).toBe(true);
  expect(claims.flatMap((result) => result.data ?? [])).toHaveLength(1);
  const denied = await first.client.rpc("claim_push_deliveries", { p_notification: notification });
  expect(denied.error?.code).toBe("42501");
  expect((await first.client.from("push_deliveries").select("*")).error?.code).toBe("42501");
});

it("une offre expirée n'est jamais envoyée ; un échec garde une file bornée à cinq essais", async () => {
  const expired = await notify(first, { expires_at: new Date(Date.now() - 1000).toISOString() }, "ride_offer");
  expect((await admin.rpc("claim_push_deliveries", { p_notification: expired })).data).toEqual([]);
  const queued = await notify(first, { expires_at: new Date(Date.now() + 60000).toISOString() }, "ride_offer");
  await serviceSql("update public.push_deliveries set expires_at=now()-interval '1 second' where notification_id=$1", [queued]);
  expect((await admin.rpc("claim_push_deliveries", { p_notification: queued })).data).toEqual([]);
  const notification = await notify(first);
  for (let attempt = 1; attempt <= 5; attempt++) {
    await serviceSql("update public.push_deliveries set next_attempt_at=now()-interval '1 second' where notification_id=$1", [notification]);
    const claim = await admin.rpc("claim_push_deliveries", { p_notification: notification });
    expect(claim.error).toBeNull();
    expect(claim.data).toHaveLength(1);
  }
  await serviceSql("update public.push_deliveries set next_attempt_at=now()-interval '1 second' where notification_id=$1", [notification]);
  expect((await admin.rpc("claim_push_deliveries", { p_notification: notification })).data).toEqual([]);
});
