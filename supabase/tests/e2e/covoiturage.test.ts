// Lot R4 : covoiturage payé à la place (arbitrages A9 à A15).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin, allOffline, createDriver, createUser, db, goOnline, point, requestRide, ridePin,
  serviceSql, type TestUser,
} from "./helpers";

/** Polyligne précision 6, comme celle de Valhalla. */
function encode(points: [number, number][]) {
  let out = "";
  let prev = [0, 0];
  for (const [lon, lat] of points) {
    const now = [Math.round(lat * 1e6), Math.round(lon * 1e6)];
    for (const i of [0, 1]) {
      let v = (now[i] - prev[i]) << 1;
      if (now[i] - prev[i] < 0) v = ~v;
      while (v >= 0x20) {
        out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>>= 5;
      }
      out += String.fromCharCode(v + 63);
    }
    prev = now;
  }
  return out;
}
const A: [number, number] = [9.45, 0.4];
const B: [number, number] = [9.47, 0.4];
const trip = (from: [number, number], to: [number, number], seats = 1, km = 3) => ({
  p_category: "covoiturage", p_origin: point(...from), p_dest: point(...to),
  p_shape: encode([from, to]), p_distance_m: km * 1000, p_options: { seats },
});
const setting = (patch: object) =>
  serviceSql("update public.app_config set value=value||$1::jsonb where key='shared_ride'", [JSON.stringify(patch)]);
const offerFor = async (driver: TestUser, ride: string) =>
  (await driver.client.from("ride_offers").select("id,status").eq("ride_id", ride).eq("status", "pending")).data?.[0];
async function board(driver: TestUser, passenger: TestUser, args: object) {
  const ride = await requestRide(passenger.client, args);
  const accepted = await driver.client.rpc("accept_ride", { p_ride: ride.id });
  if (accepted.error) throw accepted.error;
  return accepted.data;
}

let driver: TestUser;
let riders: TestUser[];

beforeAll(async () => {
  driver = await createDriver(["eco"]);
  riders = await Promise.all([1, 2, 3, 4].map(() => createUser()));
  await setting({ enabled: true });
});
beforeEach(async () => {
  await serviceSql(
    "update public.rides set status='cancelled_driver',completed_at=now() where (client_id=any($1) or driver_id=$2) and status in ('requested','accepted','enroute','arrived','started')",
    [riders.map((r) => r.id), driver.id],
  );
  await allOffline();
  await goOnline(driver, A[0], A[1]);
});
afterAll(async () => {
  await setting({ enabled: false });
  await allOffline();
  await db.end();
});

describe("covoiturage à la place", () => {
  it("tarif : 500 FCFA jusqu'à 2 km, 250 FCFA/km, plafond 1 850, multiplié par les places", async () => {
    const quote = (km: number, seats = 1, extra: object = {}) =>
      admin.rpc("create_ride_quote", {
        p_client: riders[0].id, p_duration_s: 600, ...trip(A, B, seats, km), ...extra,
      });
    expect(Number((await quote(1.2)).data.price)).toBe(500);
    expect(Number((await quote(2)).data.price)).toBe(500);
    expect(Number((await quote(3.14)).data.price)).toBe(775);
    expect(Number((await quote(7.4)).data.price)).toBe(1850);
    expect(Number((await quote(30)).data.price)).toBe(1850);
    expect(Number((await quote(3.14, 3)).data.price)).toBe(2325);
    expect((await quote(3, 4)).error?.code).toBe("22023");
    expect((await quote(3, 2, { p_category: "eco" })).error?.message).toBe("Nombre de places invalide");
    await setting({ enabled: false });
    expect((await quote(3)).error?.message).toBe("Service non ouvert");
    await setting({ enabled: true });
  });

  it("jamais plus de trois places, même quand deux offres sont acceptées de front", async () => {
    const first = await board(driver, riders[0], trip(A, B, 2));
    expect(first.shared_trip_id).not.toBeNull();
    expect(first.seats).toBe(2);
    // Deux places de plus dépasseraient : la demande n'est pas proposée à ce chauffeur.
    const tooMany = await requestRide(riders[1].client, trip(A, B, 2));
    expect(await offerFor(driver, tooMany.id)).toBeUndefined();
    // Offre forcée : la garde d'affectation refuse quand même.
    await serviceSql("insert into public.ride_offers(ride_id,driver_id,rank,expires_at) values($1,$2,1,now()+interval '30 seconds')", [tooMany.id, driver.id]);
    const forced = await driver.client.rpc("accept_ride", { p_ride: tooMany.id });
    expect(forced.error?.message).toContain("Plus assez de places");
    const fits = await board(driver, riders[2], trip(A, B, 1));
    expect(fits.shared_trip_id).toBe(first.shared_trip_id);
    const full = await requestRide(riders[3].client, trip(A, B, 1));
    expect(await offerFor(driver, full.id)).toBeUndefined();
  });

  it("proximité : un passager loin de l'itinéraire n'est pas ajouté ; une course classique non plus", async () => {
    await board(driver, riders[0], trip(A, B));
    const far = await requestRide(riders[1].client, trip([9.45, 0.42], [9.47, 0.42]));
    expect(await offerFor(driver, far.id)).toBeUndefined();
    const near = await requestRide(riders[2].client, trip([9.455, 0.4005], B));
    expect(await offerFor(driver, near.id)).toBeDefined();
    const classic = await requestRide(riders[3].client);
    expect(await offerFor(driver, classic.id)).toBeUndefined();
    await serviceSql("insert into public.ride_offers(ride_id,driver_id,rank,expires_at) values($1,$2,1,now()+interval '30 seconds')", [classic.id, driver.id]);
    expect((await driver.client.rpc("accept_ride", { p_ride: classic.id })).error?.message).toContain("course est en cours");
  });

  it("le chauffeur peut couper le covoiturage ; une moto n'en reçoit jamais", async () => {
    const moto = await createDriver(["moto"]);
    await allOffline();
    await goOnline(moto, A[0], A[1]);
    const none = await requestRide(riders[0].client, trip(A, B));
    expect(await offerFor(moto, none.id)).toBeUndefined();
    expect((await riders[0].client.rpc("set_shared_rides", { p_enabled: false })).error?.code).toBe("42501");
    expect((await driver.client.rpc("set_shared_rides", { p_enabled: false })).data).toBe(false);
    await goOnline(driver, A[0], A[1]);
    await serviceSql("select public.offer_next_driver($1)", [none.id]);
    expect(await offerFor(driver, none.id)).toBeUndefined();
    await driver.client.rpc("set_shared_rides", { p_enabled: true });
    await serviceSql("select public.offer_next_driver($1)", [none.id]);
    expect(await offerFor(driver, none.id)).toBeDefined();
  });

  it("chaque passager garde sa course : confidentialité, annulation isolée, commission par course", async () => {
    const one = await board(driver, riders[0], trip(A, B, 2));
    const two = await board(driver, riders[1], trip([9.455, 0.4005], B, 1));
    expect((await riders[0].client.from("rides").select("id").eq("id", two.id)).data).toEqual([]);
    expect((await riders[0].client.rpc("shared_trip_progress", { p_ride: two.id })).error?.code).toBe("42501");
    const progress = await riders[0].client.rpc("shared_trip_progress", { p_ride: one.id });
    expect(progress.data.seats_taken).toBe(3);
    expect(progress.data.stops.filter((s: { mine: boolean }) => s.mine)).toHaveLength(2);
    expect(Object.keys(progress.data.stops[0]).sort()).toEqual(["done", "kind", "mine"]);
    // La position envoyée pour une course est visible de l'autre passager.
    await serviceSql("insert into public.ride_locations(ride_id,driver_id,geom,recorded_at) values($1,$2,extensions.st_geomfromtext('POINT(9.451 0.4)',4326),now())", [one.id, driver.id]);
    expect((await riders[1].client.from("ride_locations").select("id").eq("ride_id", two.id)).data).toHaveLength(1);
    expect((await riders[1].client.rpc("cancel_ride", { p_ride: two.id })).error).toBeNull();
    const still = await serviceSql("select status from public.rides where id=$1", [one.id]);
    expect(still.rows[0].status).toBe("accepted");
    for (const step of ["mark_arrived"] as const) {
      expect((await driver.client.rpc(step, { p_ride: one.id })).error).toBeNull();
    }
    await driver.client.rpc("start_ride_checked", { p_ride: one.id, p_pin: await ridePin(one.id) });
    const done = await driver.client.rpc("complete_ride", { p_ride: one.id });
    expect(Number(done.data.price_final)).toBe(1500);
    const ledger = await serviceSql("select -sum(amount_signed) as c from public.ledger where ride_id=$1 and kind='commission_due'", [one.id]);
    expect(Number(ledger.rows[0].c)).toBe(225);
    const closed = await serviceSql("select status from public.shared_trips where id=$1", [one.shared_trip_id]);
    expect(closed.rows[0].status).toBe("closed");
  });
});
