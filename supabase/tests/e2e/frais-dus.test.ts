// Arbitrage A5 : des frais d'annulation dus bloquent la commande, y compris
// depuis un compte ouvert ensuite avec le même numéro ou sur le même appareil.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDriver, createUser, db, requestRide, serviceSql, type TestUser } from "./helpers";

let driver: TestUser;
const phone = () => `2410${Math.floor(1e7 + Math.random() * 9e7)}`;
const token = () => `ExpoPushToken[${randomUUID()}]`;

/** Course acceptée puis annulée par le passager : créance en attente. */
async function owe(client: TestUser) {
  const ride = await serviceSql(
    `insert into public.rides(client_id,driver_id,category,status,origin_geom,dest_geom,price_est,payment_method)
     values($1,$2,'eco','accepted',extensions.st_geomfromtext('POINT(9.45 0.4)',4326),
       extensions.st_geomfromtext('POINT(9.47 0.41)',4326),1600,'cash') returning id`,
    [client.id, driver.id],
  );
  expect((await client.client.rpc("cancel_ride", { p_ride: ride.rows[0].id })).error).toBeNull();
  return ride.rows[0].id as string;
}
async function declare(user: TestUser, value: string) {
  expect((await user.client.rpc("update_contact_phone", { p_phone: value })).error).toBeNull();
}
async function register(user: TestUser, value: string) {
  const result = await user.client.rpc("register_push_device", {
    p_user: user.id,
    p_token: value,
    p_platform: "android",
  });
  expect(result.error).toBeNull();
}
async function refused(user: TestUser) {
  const error = await requestRide(user.client).then(
    () => null,
    (e) => e,
  );
  expect(error?.code).toBe("42501");
  expect(error?.message).toContain("Frais d'annulation à régler");
}
async function cancelOpen(user: TestUser) {
  await serviceSql(
    "update public.rides set status='cancelled_client',completed_at=now() where client_id=$1 and status='requested'",
    [user.id],
  );
}

beforeAll(async () => {
  driver = await createDriver();
});
afterAll(async () => {
  await db.end();
});

describe("frais d'annulation dus", () => {
  it("bloquent la commande jusqu'à l'encaissement de la créance", async () => {
    const debtor = await createUser({ emailOnly: true });
    const ride = await owe(debtor);
    await refused(debtor);
    await serviceSql(
      "update public.cancellation_claims set status='collected',collected_at=now() where ride_id=$1",
      [ride],
    );
    expect((await requestRide(debtor.client)).status).toBe("requested");
    await cancelOpen(debtor);
  });

  it("suivent le numéro déclaré vers un compte plus récent, jamais vers un plus ancien", async () => {
    const shared = phone();
    const elder = await createUser({ emailOnly: true });
    await declare(elder, shared);
    const debtor = await createUser({ emailOnly: true });
    await declare(debtor, shared);
    await owe(debtor);
    const fresh = await createUser({ emailOnly: true });
    await declare(fresh, `+${shared}`);
    await refused(fresh);
    // Le compte ouvert avant celui du débiteur n'est pas pris en otage.
    expect((await requestRide(elder.client)).status).toBe("requested");
    await cancelOpen(elder);
  });

  it("suivent l'appareil, même quand le jeton a changé de propriétaire", async () => {
    const debtor = await createUser({ emailOnly: true });
    const device = token();
    await register(debtor, device);
    await owe(debtor);
    const fresh = await createUser({ emailOnly: true });
    await register(fresh, device);
    await refused(fresh);
    const stranger = await createUser({ emailOnly: true });
    await register(stranger, token());
    expect((await requestRide(stranger.client)).status).toBe("requested");
    await cancelOpen(stranger);
  });

  it("ne bloquent plus quand le réglage est désactivé", async () => {
    const debtor = await createUser({ emailOnly: true });
    await owe(debtor);
    await serviceSql(
      "update public.app_config set value=value||'{\"block_orders\":false}' where key='cancellation_fee'",
    );
    try {
      expect((await requestRide(debtor.client)).status).toBe("requested");
    } finally {
      await serviceSql(
        "update public.app_config set value=value-'block_orders' where key='cancellation_fee'",
      );
      await cancelOpen(debtor);
    }
  });
});
