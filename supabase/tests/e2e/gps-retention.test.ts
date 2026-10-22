import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type TestUser, allOffline, createDriver, createUser, serviceSql } from "./helpers";
let driver: TestUser;
let passenger: TestUser;
let rideId: string;
afterAll(allOffline);
beforeAll(async () => {
  driver = await createDriver();
  passenger = await createUser();
  const ride = await serviceSql(`insert into public.rides(client_id,driver_id,category,status,origin_geom,dest_geom,price_est,payment_method)
    values($1,$2,'eco','started',extensions.st_geomfromtext('POINT(9.45 0.4)',4326),
    extensions.st_geomfromtext('POINT(9.47 0.41)',4326),1600,'cash') returning id`, [passenger.id, driver.id]);
  rideId = ride.rows[0].id;
});

it("la reprise d'un même échantillon ne le double pas et conserve son heure réelle", async () => {
  const sampleId = randomUUID();
  const measuredAt = new Date(Date.now() - 3600000).toISOString();
  const sample = { ride_id: rideId, driver_id: driver.id, geom: "SRID=4326;POINT(9.45 0.4)", sample_id: sampleId, recorded_at: measuredAt };
  for (let i = 0; i < 2; i++) {
    const result = await driver.client.from("ride_locations").upsert(sample, { onConflict: "sample_id", ignoreDuplicates: true });
    expect(result.error).toBeNull();
  }
  const actual = await serviceSql("select recorded_at from public.ride_locations where sample_id=$1", [sampleId]);
  expect(actual.rows).toHaveLength(1);
  expect(new Date(actual.rows[0].recorded_at).toISOString()).toBe(measuredAt);
});

it("refuse les mesures trop anciennes ou futures sans insérer de position", async () => {
  for (const offset of [-86401000, 60000]) {
    const id = randomUUID();
    const result = await driver.client.from("ride_locations").insert({ ride_id: rideId, driver_id: driver.id,
      geom: "SRID=4326;POINT(9.45 0.4)", sample_id: id, recorded_at: new Date(Date.now() + offset).toISOString() });
    expect(result.error?.code).toBe("42501");
    expect((await serviceSql("select id from public.ride_locations where sample_id=$1", [id])).rows).toHaveLength(0);
  }
});

it("cache les points de plus de 7 jours puis les purge ; un usager ne peut déclencher la purge", async () => {
  const sampleId = randomUUID();
  const added = await driver.client.from("ride_locations").insert({ ride_id: rideId, driver_id: driver.id,
    geom: "SRID=4326;POINT(9.45 0.4)", sample_id: sampleId });
  expect(added.error).toBeNull();
  // Vieillir uniquement notre fixture, sans désactiver les gardes de production.
  await serviceSql("update public.ride_locations set recorded_at=now()-interval '8 days' where sample_id=$1", [sampleId]);
  const hidden = await passenger.client.from("ride_locations").select("id").eq("sample_id", sampleId);
  expect(hidden.error).toBeNull();
  expect(hidden.data).toHaveLength(0);
  expect((await passenger.client.rpc("purge_ride_locations")).error?.code).toBe("42501");
  await serviceSql("select public.purge_ride_locations()");
  expect((await serviceSql("select id from public.ride_locations where sample_id=$1", [sampleId])).rows).toHaveLength(0);
  const cron = await serviceSql("select active,schedule from cron.job where jobname='teko-alpha-gps-retention'");
  expect(cron.rows).toEqual([{ active: true, schedule: "*/5 * * * *" }]);
});

it("le retrait de disponibilité est immédiat et ne retire pas un autre chauffeur", async () => {
  const other = await createDriver();
  for (const user of [driver, other]) expect((await user.client.rpc("driver_heartbeat", { p_point: "SRID=4326;POINT(9.45 0.4)" })).error).toBeNull();
  expect((await driver.client.rpc("driver_offline")).error).toBeNull();
  const rows = await serviceSql("select driver_id from public.driver_presence where driver_id=any($1::uuid[])", [[driver.id, other.id]]);
  expect(rows.rows).toEqual([{ driver_id: other.id }]);
});
