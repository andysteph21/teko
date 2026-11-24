// Clôture automatique d'une course démarrée (décision du 12 novembre 2026) :
// passé le délai, la course suit le circuit normal de fin au nom du
// chauffeur ; une course récente ou non démarrée n'est pas touchée.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestUser,
  allOffline,
  createDriver,
  createUser,
  goOnline,
  requestRide,
  ridePin,
  serviceSql,
} from "./helpers";

let passenger: TestUser;
let driver: TestUser;

afterAll(allOffline);
beforeAll(async () => {
  await allOffline();
  passenger = await createUser();
  driver = await createDriver(["eco"]);
});

async function startedRide(): Promise<string> {
  await goOnline(driver, 9.4535, 0.4031);
  const ride = await requestRide(passenger.client);
  for (const [name, args] of [
    ["accept_ride", { p_ride: ride.id }],
    ["mark_arrived", { p_ride: ride.id }],
    ["start_ride_checked", { p_ride: ride.id, p_pin: await ridePin(ride.id) }],
  ] as const) {
    const result = await driver.client.rpc(name, args);
    if (result.error) throw result.error;
  }
  return ride.id;
}

describe("clôture automatique des courses démarrées", () => {
  it("une course récente reste en cours ; un usager ne peut pas lancer la tâche", async () => {
    const rideId = await startedRide();
    await serviceSql("select public.auto_complete_stale_rides()");
    const fresh = await serviceSql("select status from public.rides where id = $1", [rideId]);
    expect(fresh.rows[0].status).toBe("started");
    const forbidden = await driver.client.rpc("auto_complete_stale_rides");
    expect(forbidden.error).not.toBeNull();

    await serviceSql(
      "update public.rides set started_at = now() - interval '3 hours 1 minute' where id = $1",
      [rideId],
    );
    const balanceBefore = await driver.client.rpc("driver_balance", { p_driver: driver.id });
    const closed = await serviceSql("select public.auto_complete_stale_rides() as n");
    expect(Number(closed.rows[0].n)).toBeGreaterThanOrEqual(1);

    const done = await serviceSql(
      "select status, price_final, price_est, completed_at from public.rides where id = $1",
      [rideId],
    );
    expect(done.rows[0].status).toBe("completed");
    expect(Number(done.rows[0].price_final)).toBe(Number(done.rows[0].price_est));
    const events = await serviceSql(
      "select type from public.ride_events where ride_id = $1 and type in ('completed','auto_completed')",
      [rideId],
    );
    expect(events.rows.map((r) => r.type).sort()).toEqual(["auto_completed", "completed"]);
    const balanceAfter = await driver.client.rpc("driver_balance", { p_driver: driver.id });
    expect(Number(balanceAfter.data)).toBeLessThan(Number(balanceBefore.data));
    const again = await serviceSql(
      "select count(*)::int as n from public.ledger where ride_id = $1",
      [rideId],
    );
    await serviceSql("select public.auto_complete_stale_rides()");
    const after = await serviceSql(
      "select count(*)::int as n from public.ledger where ride_id = $1",
      [rideId],
    );
    expect(after.rows[0].n).toBe(again.rows[0].n);
  });

  it("un trajet long garde quatre fois sa durée estimée avant la clôture", async () => {
    const rideId = await startedRide();
    await serviceSql(
      "update public.rides set started_at = now() - interval '4 hours', duration_est_s = 7200 where id = $1",
      [rideId],
    );
    await serviceSql("select public.auto_complete_stale_rides()");
    const state = await serviceSql("select status from public.rides where id = $1", [rideId]);
    expect(state.rows[0].status).toBe("started");
    const end = await driver.client.rpc("complete_ride", { p_ride: rideId });
    expect(end.error).toBeNull();
  });
});
