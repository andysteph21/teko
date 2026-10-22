import { beforeAll, expect, it } from "vitest";
import { type TestUser, createUser, createDriver, serviceSql } from "./helpers";

let driver: TestUser;
let passenger: TestUser;
let ride: string;
beforeAll(async () => {
  driver = await createDriver();
  passenger = await createUser();
  const result = await serviceSql(`insert into public.rides(client_id,driver_id,category,status,
    origin_geom,dest_geom,price_est,payment_method,pin_code)
    values($1,$2,'eco','arrived',extensions.st_geomfromtext('POINT(9.45 0.4)',4326),
      extensions.st_geomfromtext('POINT(9.47 0.41)',4326),1600,'cash','4729') returning id`, [passenger.id, driver.id]);
  ride = result.rows[0].id;
});

it("cinq échecs persistent entre requêtes, le bon PIN reste bloqué et l'ancien contrat est fermé", async () => {
  const old = await driver.client.rpc("start_ride", { p_ride: ride, p_pin: "4729" });
  expect(old.error?.code).toBe("42501");
  for (let n = 1; n <= 5; n++) {
    const attempt = await driver.client.rpc("start_ride_checked", { p_ride: ride, p_pin: "1111" });
    expect(attempt.error).toBeNull();
    expect(attempt.data.error).toBe(n === 5 ? "pin_blocked" : "pin_incorrect");
    expect(attempt.data.attempts_remaining).toBe(5 - n);
  }
  const blocked = await driver.client.rpc("start_ride_checked", { p_ride: ride, p_pin: "4729" });
  expect(blocked.error).toBeNull();
  expect(blocked.data.error).toBe("pin_blocked");
  expect(blocked.data.retry_after_s).toBeGreaterThan(290);
  const state = await serviceSql("select status from public.rides where id=$1", [ride]);
  expect(state.rows[0].status).toBe("arrived");
  const audit = await serviceSql("select meta from public.ride_events where ride_id=$1 and type='pin_failed'", [ride]);
  expect(audit.rows).toHaveLength(5);
  expect(JSON.stringify(audit.rows)).not.toContain("1111");
  expect(JSON.stringify(audit.rows)).not.toContain("4729");
  await serviceSql("update private.ride_pins set blocked_until=now()-interval '1 second' where ride_id=$1", [ride]);
  const started = await driver.client.rpc("start_ride_checked", { p_ride: ride, p_pin: "4729" });
  expect(started.error).toBeNull();
  expect(started.data.ride.status).toBe("started");
  expect(started.data.ride.pin_code).toBeNull();
});
