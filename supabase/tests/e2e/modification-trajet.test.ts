// Lot R3 : changement de destination et arrêts en cours de course (A6 à A8).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin, allOffline, createDriver, createUser, db, goOnline, requestRide, ridePin,
  serviceSql, type TestUser,
} from "./helpers";

let passenger: TestUser;
let driver: TestUser;
let stranger: TestUser;
const DEST = { lon: 9.48, lat: 0.42, hint: "portail vert" };
const STOP = { lon: 9.46, lat: 0.41 };
const ROUTE = { distance_m: 4200, duration_s: 900, shape: "_p~iF~ps|U_ulLnnqC" };

/** Devis de modification posé par le serveur, comme le fait price-quote. */
const quote = (ride: string, extra: { stops?: object[]; route?: object; client?: string } = {}) =>
  admin.rpc("create_route_change_quote", {
    p_ride: ride, p_client: extra.client ?? passenger.id, p_dest: DEST,
    p_stops: extra.stops ?? [], p_route: extra.route ?? ROUTE,
  });
async function activeRide(started = false) {
  await goOnline(driver, 9.4535, 0.4031);
  const ride = await requestRide(passenger.client);
  expect((await driver.client.rpc("accept_ride", { p_ride: ride.id })).error).toBeNull();
  if (started) {
    expect((await driver.client.rpc("mark_arrived", { p_ride: ride.id })).error).toBeNull();
    const start = await driver.client.rpc("start_ride_checked", { p_ride: ride.id, p_pin: await ridePin(ride.id) });
    expect(start.error).toBeNull();
  }
  return ride;
}
const rideRow = async (id: string) =>
  (await serviceSql("select status,price_est,price_final,dest_hint,distance_est_m from public.rides where id=$1", [id])).rows[0];
async function accepted(ride: string, stops: object[] = []) {
  const q = await quote(ride, { stops });
  expect(q.error).toBeNull();
  expect((await passenger.client.rpc("request_route_change", { p_change: q.data.id })).error).toBeNull();
  const answer = await driver.client.rpc("respond_route_change", { p_change: q.data.id, p_accept: true });
  expect(answer.error).toBeNull();
  expect(answer.data.status).toBe("accepted");
  return q.data;
}

beforeAll(async () => {
  passenger = await createUser();
  stranger = await createUser();
  driver = await createDriver();
});
beforeEach(async () => {
  await serviceSql(
    "update public.rides set status='cancelled_driver',completed_at=now() where (client_id=$1 or driver_id=$2) and status in ('requested','accepted','enroute','arrived','started')",
    [passenger.id, driver.id],
  );
  await allOffline();
});
afterAll(async () => {
  await allOffline();
  await db.end();
});

describe("modification de trajet", () => {
  it("le nouveau prix n'est jamais inférieur au prix accepté et rien ne change avant l'accord du chauffeur", async () => {
    const ride = await activeRide();
    const before = await rideRow(ride.id);
    const cheap = await quote(ride.id, { route: { ...ROUTE, distance_m: 300, duration_s: 60 } });
    expect(cheap.error).toBeNull();
    expect(Number(cheap.data.new_price)).toBe(Number(before.price_est));
    const q = await quote(ride.id, { route: { ...ROUTE, distance_m: 9000, duration_s: 1800 } });
    expect(Number(q.data.new_price)).toBeGreaterThan(Number(before.price_est));
    // Le premier devis est remplacé : il ne peut plus être confirmé.
    expect((await passenger.client.rpc("request_route_change", { p_change: cheap.data.id })).error?.code).toBe("22023");
    // Le chauffeur ne voit pas un devis non confirmé et ne peut pas y répondre.
    expect((await driver.client.from("ride_route_changes").select("id").eq("id", q.data.id)).data).toEqual([]);
    expect((await driver.client.rpc("respond_route_change", { p_change: q.data.id, p_accept: true })).error?.code).toBe("42501");
    expect((await stranger.client.rpc("request_route_change", { p_change: q.data.id })).error?.code).toBe("42501");
    const asked = await passenger.client.rpc("request_route_change", { p_change: q.data.id });
    expect(asked.error).toBeNull();
    expect(asked.data.status).toBe("pending");
    expect((await rideRow(ride.id)).price_est).toBe(before.price_est);
    expect((await stranger.client.rpc("respond_route_change", { p_change: q.data.id, p_accept: true })).error?.code).toBe("42501");
    const answer = await driver.client.rpc("respond_route_change", { p_change: q.data.id, p_accept: true });
    expect(answer.data.status).toBe("accepted");
    const after = await rideRow(ride.id);
    expect(Number(after.price_est)).toBe(Number(q.data.new_price));
    expect(after.dest_hint).toBe("portail vert");
    expect(after.distance_est_m).toBe(9000);
    const event = await serviceSql("select meta from public.ride_events where ride_id=$1 and type='route_changed'", [ride.id]);
    expect(Number(event.rows[0].meta.old_price)).toBe(Number(before.price_est));
    expect((await driver.client.rpc("respond_route_change", { p_change: q.data.id, p_accept: false })).error?.code).toBe("22023");
  });

  it("refus ou silence de 30 secondes : la course initiale se poursuit inchangée", async () => {
    const ride = await activeRide();
    const before = await rideRow(ride.id);
    const first = await quote(ride.id, { route: { ...ROUTE, distance_m: 9000 } });
    await passenger.client.rpc("request_route_change", { p_change: first.data.id });
    const second = await quote(ride.id);
    expect((await passenger.client.rpc("request_route_change", { p_change: second.data.id })).error?.code).toBe("22023");
    const refused = await driver.client.rpc("respond_route_change", { p_change: first.data.id, p_accept: false });
    expect(refused.data.status).toBe("refused");
    const third = await quote(ride.id, { route: { ...ROUTE, distance_m: 9000 } });
    const asked = await passenger.client.rpc("request_route_change", { p_change: third.data.id });
    expect(new Date(asked.data.respond_by).getTime() - new Date(asked.data.requested_at).getTime()).toBe(30000);
    await serviceSql("update public.ride_route_changes set respond_by=now()-interval '1 second' where id=$1", [third.data.id]);
    const late = await driver.client.rpc("respond_route_change", { p_change: third.data.id, p_accept: true });
    expect(late.data.status).toBe("expired");
    const after = await rideRow(ride.id);
    expect(after.price_est).toBe(before.price_est);
    expect(after.dest_hint).toBe(before.dest_hint);
    const fourth = await quote(ride.id);
    await passenger.client.rpc("request_route_change", { p_change: fourth.data.id });
    await serviceSql("update public.ride_route_changes set respond_by=now()-interval '1 second' where id=$1", [fourth.data.id]);
    await serviceSql("select public.expire_route_changes()");
    const swept = await passenger.client.from("ride_route_changes").select("status").eq("id", fourth.data.id).single();
    expect(swept.data?.status).toBe("expired");
  });

  it("limites : deux arrêts, trois modifications, jamais en covoiturage ni hors course active", async () => {
    const ride = await activeRide();
    expect((await quote(ride.id, { stops: [STOP, STOP, STOP] })).error?.message).toContain("arrêts maximal");
    expect((await quote(ride.id, { client: stranger.id })).error?.code).toBe("42501");
    expect((await quote(ride.id, { route: { ...ROUTE, distance_m: 0 } })).error?.code).toBe("22023");
    await accepted(ride.id, [STOP, STOP]);
    await accepted(ride.id, [STOP]);
    await accepted(ride.id);
    expect((await quote(ride.id)).error?.message).toContain("modifications maximal");
    const stops = await passenger.client.from("ride_stops").select("seq").eq("ride_id", ride.id);
    expect(stops.data).toEqual([]);
    await serviceSql("update public.rides set status='cancelled_driver',completed_at=now() where id=$1", [ride.id]);
    expect((await quote(ride.id)).error?.code).toBe("22023");
  });

  it("arrêts : ordre imposé, attente gratuite trois minutes puis facturée, fin de course au dernier prix", async () => {
    const ride = await activeRide(true);
    const change = await accepted(ride.id, [STOP, { ...STOP, hint: "pharmacie" }]);
    const stops = (await driver.client.from("ride_stops").select("id,seq,hint").eq("ride_id", ride.id).order("seq")).data!;
    expect(stops.map((s) => s.seq)).toEqual([1, 2]);
    expect((await stranger.client.from("ride_stops").select("id").eq("ride_id", ride.id)).data).toEqual([]);
    expect((await passenger.client.rpc("arrive_stop", { p_stop: stops[0].id })).error?.code).toBe("42501");
    expect((await driver.client.rpc("arrive_stop", { p_stop: stops[1].id })).error?.code).toBe("22023");
    expect((await driver.client.rpc("leave_stop", { p_stop: stops[0].id })).error?.code).toBe("22023");
    expect((await driver.client.rpc("arrive_stop", { p_stop: stops[0].id })).error).toBeNull();
    expect((await driver.client.rpc("complete_ride", { p_ride: ride.id })).error?.message).toContain("arrêt est en cours");
    const free = await driver.client.rpc("leave_stop", { p_stop: stops[0].id });
    expect(Number(free.data.wait_charged)).toBe(0);
    await driver.client.rpc("arrive_stop", { p_stop: stops[1].id });
    await serviceSql("update public.ride_stops set arrived_at=now()-interval '310 seconds' where id=$1", [stops[1].id]);
    const paid = await driver.client.rpc("leave_stop", { p_stop: stops[1].id });
    // 5 min 10 s : six minutes entamées, trois gratuites, trois au tarif à la
    // minute en vigueur (25 FCFA dans la grille de départ), au pas de 25.
    const rule = await serviceSql(
      "select per_min from public.pricing_rules where category='eco' and service_type='ride' and zone_id is null order by valid_from desc limit 1",
    );
    const wait = Math.round((Number(rule.rows[0].per_min) * 3) / 25) * 25;
    expect(wait).toBeGreaterThan(0);
    expect(Number(paid.data.wait_charged)).toBe(wait);
    const done = await driver.client.rpc("complete_ride", { p_ride: ride.id });
    expect(done.error).toBeNull();
    expect(Number(done.data.price_final)).toBe(Number(change.new_price) + wait);
    // Reçu, grand livre et commission suivent le dernier prix accepté.
    const commission = await serviceSql(
      "select -sum(amount_signed) as c, public.commission_amount($2::numeric) as due from public.ledger where ride_id=$1 and kind='commission_due'",
      [ride.id, done.data.price_final],
    );
    expect(Number(commission.rows[0].c)).toBe(Number(commission.rows[0].due));
    expect((await quote(ride.id)).error?.code).toBe("22023");
  });

  it("une modification en attente tombe quand la course se termine", async () => {
    const ride = await activeRide(true);
    const q = await quote(ride.id, { route: { ...ROUTE, distance_m: 9000 } });
    await passenger.client.rpc("request_route_change", { p_change: q.data.id });
    const before = await rideRow(ride.id);
    const done = await driver.client.rpc("complete_ride", { p_ride: ride.id });
    expect(done.data.price_final).toBe(Number(before.price_est));
    const late = await driver.client.rpc("respond_route_change", { p_change: q.data.id, p_accept: true });
    expect(late.error?.code).toBe("22023");
  });
});
