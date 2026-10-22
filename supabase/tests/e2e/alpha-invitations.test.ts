import { beforeAll, expect, it } from "vitest";
import { type TestUser, admin, createUser, createDriver, serviceSql, ORIGIN, DEST } from "./helpers";

let ops: TestUser;
let stranger: TestUser;
let driver: TestUser;
beforeAll(async () => {
  ops = await createUser({ role: "admin", adminRole: "ops" });
  stranger = await createUser({ invited: false });
  driver = await createDriver();
});

it("un compte authentifié non invité n'obtient pas de devis et ne peut pas s'inviter", async () => {
  const quote = await admin.rpc("create_ride_quote", {
    p_client: stranger.id,p_category: "eco",p_origin: ORIGIN,p_dest: DEST,
    p_distance_m: 3200,p_duration_s: 720,p_shape: "fixture",
  });
  expect(quote.error?.code).toBe("42501");
  const self = await stranger.client.rpc("invite_alpha", { p_phone: "+24107001111", p_role: "client" });
  expect(self.error?.code).toBe("42501");
  const direct = await stranger.client.from("alpha_invites").insert({ phone: "24107001111", role: "client" });
  expect(direct.error).not.toBeNull();
});

it("changer son téléphone de profil ne permet pas d'emprunter l'invitation d'un autre", async () => {
  const invited = await createUser();
  const real = await admin.auth.admin.getUserById(invited.id);
  await stranger.client.from("profiles").update({ phone: real.data.user!.phone }).eq("id", stranger.id);
  const allowed = await stranger.client.rpc("is_alpha_invited", { p_role: "client" });
  expect(allowed.error).toBeNull();
  expect(allowed.data).toBe(false);
});

it("Ops invite le vrai numéro vérifié ; la révocation avant commande invalide un devis existant", async () => {
  const real = await admin.auth.admin.getUserById(stranger.id);
  const invited = await ops.client.rpc("invite_alpha", { p_phone: `+${real.data.user!.phone}`, p_role: "client" });
  expect(invited.error).toBeNull();
  const quote = await admin.rpc("create_ride_quote", {
    p_client: stranger.id,p_category: "eco",p_origin: ORIGIN,p_dest: DEST,
    p_distance_m: 3200,p_duration_s: 720,p_shape: "fixture",
  });
  expect(quote.error).toBeNull();
  const revoked = await ops.client.rpc("invite_alpha", { p_phone: real.data.user!.phone, p_role: "client", p_active: false });
  expect(revoked.error).toBeNull();
  const order = await stranger.client.rpc("request_quoted_ride", { p_quote: quote.data.id });
  expect(order.error?.code).toBe("42501");
  const rides = await serviceSql("select id from public.rides where client_id=$1", [stranger.id]);
  expect(rides.rows).toHaveLength(0);
});

it("une invitation chauffeur retirée bloque le heartbeat et son écriture directe", async () => {
  const real = await admin.auth.admin.getUserById(driver.id);
  const revoked = await ops.client.rpc("invite_alpha", { p_phone: real.data.user!.phone, p_role: "driver", p_active: false });
  expect(revoked.error).toBeNull();
  const heartbeat = await driver.client.rpc("driver_heartbeat", { p_point: ORIGIN });
  expect(heartbeat.error?.code).toBe("42501");
  const direct = await driver.client.from("driver_presence").upsert({ driver_id: driver.id, geom: ORIGIN });
  expect(direct.error?.code).toBe("42501");
});
