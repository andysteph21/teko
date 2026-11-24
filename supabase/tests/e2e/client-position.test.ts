// Position du passager à la commande (décision du 12 novembre 2026) :
// écrite par le seul passager, lue par le chauffeur après acceptation,
// effacée à la prise en charge.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestUser,
  allOffline,
  createDriver,
  createUser,
  goOnline,
  pendingOffer,
  requestRide,
  ridePin,
  serviceSql,
} from "./helpers";

let passenger: TestUser;
let driver: TestUser;
let stranger: TestUser;
let rideId: string;
const POINT = "SRID=4326;POINT(9.4541 0.4036)";

afterAll(allOffline);
beforeAll(async () => {
  await allOffline();
  passenger = await createUser();
  stranger = await createUser();
  driver = await createDriver(["eco"]);
  await goOnline(driver, 9.4538, 0.4035);
  rideId = (await requestRide(passenger.client)).id;
});

const read = (user: TestUser) =>
  user.client.from("ride_client_positions").select("geom").eq("ride_id", rideId);

describe("position du passager à la commande", () => {
  it("seul le passager de la course peut l'écrire, et pas en direct dans la table", async () => {
    const foreign = await stranger.client.rpc("set_ride_client_position", {
      p_ride: rideId,
      p_point: POINT,
    });
    expect(foreign.error?.code).toBe("42501");
    const direct = await passenger.client
      .from("ride_client_positions")
      .insert({ ride_id: rideId, geom: POINT });
    expect(direct.error).not.toBeNull();
    const own = await passenger.client.rpc("set_ride_client_position", {
      p_ride: rideId,
      p_point: POINT,
    });
    expect(own.error).toBeNull();
  });

  it("invisible du chauffeur avant l'acceptation, visible après, jamais d'un tiers", async () => {
    expect((await read(driver)).data).toHaveLength(0);
    const offer = await pendingOffer(driver, rideId);
    await driver.client.rpc("respond_offer", { p_offer: offer.id, p_accept: true });
    const seen = await read(driver);
    expect(seen.error).toBeNull();
    expect(JSON.stringify(seen.data?.[0]?.geom)).toContain("9.4541");
    expect((await read(stranger)).data).toHaveLength(0);
  });

  it("effacée à la prise en charge, et plus modifiable ensuite", async () => {
    await driver.client.rpc("mark_arrived", { p_ride: rideId });
    const started = await driver.client.rpc("start_ride_checked", {
      p_ride: rideId,
      p_pin: await ridePin(rideId),
    });
    expect(started.error).toBeNull();
    const left = await serviceSql(
      "select 1 from public.ride_client_positions where ride_id = $1",
      [rideId],
    );
    expect(left.rows).toHaveLength(0);
    const late = await passenger.client.rpc("set_ride_client_position", {
      p_ride: rideId,
      p_point: POINT,
    });
    expect(late.error?.code).toBe("42501");
    await serviceSql(
      "update public.rides set status='cancelled_driver', completed_at=now() where id=$1",
      [rideId],
    );
  });
});
