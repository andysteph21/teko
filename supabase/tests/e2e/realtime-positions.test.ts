// Suivi temps réel (ADR-13) : une position écrite par le chauffeur, avec
// l'identifiant d'échantillon de la file GPS, doit parvenir au passager de
// la course et à lui seul (retour terrain du 11 novembre 2026).

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type TestUser, allOffline, createDriver, createUser, serviceSql } from "./helpers";

let driver: TestUser;
let passenger: TestUser;
let stranger: TestUser;
let rideId: string;

afterAll(allOffline);
beforeAll(async () => {
  driver = await createDriver();
  passenger = await createUser();
  stranger = await createUser();
  const ride = await serviceSql(
    `insert into public.rides(client_id,driver_id,category,status,origin_geom,dest_geom,price_est,payment_method)
    values($1,$2,'eco','started',extensions.st_geomfromtext('POINT(9.45 0.4)',4326),
    extensions.st_geomfromtext('POINT(9.47 0.41)',4326),1600,'cash') returning id`,
    [passenger.id, driver.id],
  );
  rideId = ride.rows[0].id;
});

function listen(user: TestUser, received: unknown[]) {
  return new Promise<() => Promise<unknown>>((resolve, reject) => {
    const channel = user.client
      .channel(`ride-positions-${rideId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_locations", filter: `ride_id=eq.${rideId}` },
        (payload) => received.push(payload.new),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") resolve(() => user.client.removeChannel(channel));
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
      });
  });
}

it("le passager reçoit la position du chauffeur, un tiers ne reçoit rien", async () => {
  const forPassenger: Array<{ geom: unknown; recorded_at: string }> = [];
  const forStranger: unknown[] = [];
  const stopPassenger = await listen(passenger, forPassenger);
  const stopStranger = await listen(stranger, forStranger);
  // Après SUBSCRIBED, Realtime met encore un instant à brancher la
  // réplication (plusieurs secondes à froid, en CI) : le chauffeur envoie une
  // position par seconde, comme en course, jusqu'à la première réception.
  const deadline = Date.now() + 25_000;
  while (forPassenger.length === 0 && Date.now() < deadline) {
    const sent = await driver.client.from("ride_locations").upsert(
      {
        ride_id: rideId,
        driver_id: driver.id,
        geom: "SRID=4326;POINT(9.4612 0.4051)",
        sample_id: randomUUID(),
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "sample_id", ignoreDuplicates: true },
    );
    expect(sent.error).toBeNull();
    await new Promise((r) => setTimeout(r, 1000));
  }
  await stopPassenger();
  await stopStranger();
  expect(forPassenger.length).toBeGreaterThanOrEqual(1);
  expect(JSON.stringify(forPassenger[0].geom)).toContain("9.4612");
  expect(forStranger).toHaveLength(0);
}, 40_000);
