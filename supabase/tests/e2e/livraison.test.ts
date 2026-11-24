// Lot R5 : livraison de colis, code et photo à la remise (A16 à A18).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin, allOffline, createDriver, createUser, db, DEST, DISTANCE_M, DURATION_S, goOnline,
  ORIGIN, ridePin, serviceSql, type TestUser,
} from "./helpers";

let sender: TestUser;
let stranger: TestUser;
let courier: TestUser;
let ops: TestUser;
const PARCEL = { description: "Enveloppe de documents", size: "small", recipient_name: "Awa", recipient_phone: "+241 07 11 22 33" };
const setting = (patch: object) =>
  serviceSql("update public.app_config set value=value||$1::jsonb where key='delivery'", [JSON.stringify(patch)]);
const quote = (extra: object = {}) =>
  admin.rpc("create_ride_quote", {
    p_client: sender.id, p_category: "eco", p_origin: ORIGIN, p_dest: DEST, p_distance_m: DISTANCE_M,
    p_duration_s: DURATION_S, p_shape: "_p~iF~ps|U_ulLnnqC_mqNvxq`@", p_options: { service: "delivery" }, ...extra,
  });
async function order() {
  const q = await quote();
  expect(q.error).toBeNull();
  const ride = await sender.client.rpc("request_delivery", { p_quote: q.data.id, p_parcel: PARCEL });
  expect(ride.error).toBeNull();
  return ride.data;
}
async function carried() {
  const ride = await order();
  expect((await courier.client.rpc("accept_ride", { p_ride: ride.id })).error).toBeNull();
  expect((await courier.client.rpc("mark_arrived", { p_ride: ride.id })).error).toBeNull();
  const start = await courier.client.rpc("start_ride_checked", { p_ride: ride.id, p_pin: await ridePin(ride.id) });
  expect(start.data.error).toBeUndefined();
  return ride;
}
const photo = (ride: string, user: TestUser = courier) =>
  user.client.storage.from("delivery-proofs").upload(`${ride}/remise.jpg`, new Blob(["jpeg"]), { contentType: "image/jpeg" });

beforeAll(async () => {
  sender = await createUser();
  stranger = await createUser();
  ops = await createUser({ role: "admin", adminRole: "ops" });
  courier = await createDriver(["eco"]);
  await setting({ enabled: true });
  expect((await courier.client.rpc("set_delivery_enabled", { p_enabled: true })).data).toBe(true);
});
beforeEach(async () => {
  await serviceSql(
    "update public.rides set status='cancelled_driver',completed_at=now() where (client_id=$1 or driver_id=$2) and status in ('requested','accepted','enroute','arrived','started')",
    [sender.id, courier.id],
  );
  await allOffline();
  await goOnline(courier, 9.4535, 0.4031);
});
afterAll(async () => {
  await setting({ enabled: false });
  await allOffline();
  await db.end();
});

describe("livraison", () => {
  it("fermée côté serveur par défaut ; grille propre, voiture ou moto seulement", async () => {
    await setting({ enabled: false });
    expect((await quote()).error?.message).toBe("Service non ouvert");
    expect((await sender.client.rpc("service_availability")).data.delivery).toBe(false);
    await setting({ enabled: true });
    expect((await sender.client.rpc("service_availability")).data.delivery).toBe(true);
    const open = await quote();
    const closing = await setting({ enabled: false });
    expect(closing).toBeDefined();
    expect((await sender.client.rpc("request_delivery", { p_quote: open.data.id, p_parcel: PARCEL })).error?.message).toBe("Service non ouvert");
    await setting({ enabled: true });
    const car = await quote();
    const ride = await admin.rpc("create_ride_quote", {
      p_client: sender.id, p_category: "eco", p_origin: ORIGIN, p_dest: DEST, p_distance_m: DISTANCE_M,
      p_duration_s: DURATION_S, p_shape: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
    });
    expect(car.data.service_type).toBe("delivery");
    expect(Number(car.data.price)).toBe(1150);
    expect(Number(ride.data.price)).toBe(1600);
    expect(Number((await quote({ p_category: "moto" })).data.price)).toBe(775);
    expect((await quote({ p_category: "confort" })).error?.message).toBe("Véhicule de livraison invalide");
  });

  it("une livraison ne naît qu'avec son colis, et seul un chauffeur volontaire la reçoit", async () => {
    const q = await quote();
    expect((await sender.client.rpc("request_quoted_ride", { p_quote: q.data.id })).error?.message).toBe("Détails du colis requis");
    expect((await sender.client.rpc("request_delivery", { p_quote: q.data.id, p_parcel: { ...PARCEL, size: "géant" } })).error?.code).toBe("22023");
    expect((await sender.client.rpc("request_delivery", { p_quote: q.data.id, p_parcel: { ...PARCEL, recipient_phone: "12" } })).error?.code).toBe("22023");
    expect((await stranger.client.rpc("request_delivery", { p_quote: q.data.id, p_parcel: PARCEL })).error?.code).toBe("42501");
    await courier.client.rpc("set_delivery_enabled", { p_enabled: false });
    const ride = await sender.client.rpc("request_delivery", { p_quote: q.data.id, p_parcel: PARCEL });
    expect(ride.data.service_type).toBe("delivery");
    const none = await courier.client.from("ride_offers").select("id").eq("ride_id", ride.data.id);
    expect(none.data).toEqual([]);
    await courier.client.rpc("set_delivery_enabled", { p_enabled: true });
    await serviceSql("select public.offer_next_driver($1)", [ride.data.id]);
    const offer = (await courier.client.from("ride_offers").select("id").eq("ride_id", ride.data.id)).data![0];
    const details = await courier.client.rpc("offer_details", { p_offer: offer.id });
    expect(details.data.service_type).toBe("delivery");
    expect(details.data.parcel_size).toBe("small");
    expect(JSON.stringify(details.data)).not.toContain("Awa");
    // Avant affectation, le coursier ne lit pas les coordonnées du destinataire.
    expect((await courier.client.from("ride_parcels").select("*").eq("ride_id", ride.data.id)).data).toEqual([]);
  });

  it("coordonnées du destinataire : expéditeur, coursier affecté et opérations seulement", async () => {
    const ride = await carried();
    const mine = await courier.client.from("ride_parcels").select("recipient_name,recipient_phone").eq("ride_id", ride.id).single();
    expect(mine.data).toEqual({ recipient_name: "Awa", recipient_phone: "24107112233" });
    expect((await stranger.client.from("ride_parcels").select("*").eq("ride_id", ride.id)).data).toEqual([]);
    expect((await ops.client.from("ride_parcels").select("ride_id").eq("ride_id", ride.id)).data).toHaveLength(1);
    expect((await courier.client.rpc("delivery_code", { p_ride: ride.id })).error?.code).toBe("42501");
    expect((await sender.client.rpc("delivery_code", { p_ride: ride.id })).data).toMatch(/^\d{4}$/);
  });

  it("remise : photo et code exigés, code limité à cinq essais, aucun autre chemin de clôture", async () => {
    const ride = await carried();
    const code = (await sender.client.rpc("delivery_code", { p_ride: ride.id })).data as string;
    const wrong = code === "0000" ? "1111" : "0000";
    expect((await courier.client.rpc("complete_ride", { p_ride: ride.id })).error?.message).toBe("Preuve de remise requise");
    expect((await courier.client.rpc("complete_delivery", { p_ride: ride.id, p_code: code, p_photo_path: `${ride.id}/absente.jpg` })).error?.message).toBe("Photo de remise requise");
    expect((await photo(ride.id, stranger)).error).not.toBeNull();
    expect((await photo(ride.id)).error).toBeNull();
    const path = `${ride.id}/remise.jpg`;
    expect((await stranger.client.rpc("complete_delivery", { p_ride: ride.id, p_code: code, p_photo_path: path })).error?.code).toBe("42501");
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const miss = await courier.client.rpc("complete_delivery", { p_ride: ride.id, p_code: wrong, p_photo_path: path });
      expect(miss.data).toMatchObject({ error: "code_incorrect", attempts_remaining: 5 - attempt });
    }
    const blocked = await courier.client.rpc("complete_delivery", { p_ride: ride.id, p_code: wrong, p_photo_path: path });
    expect(blocked.data.error).toBe("code_blocked");
    expect((await courier.client.rpc("complete_delivery", { p_ride: ride.id, p_code: code, p_photo_path: path })).data.error).toBe("code_blocked");
    await serviceSql("update private.parcel_codes set blocked_until=now()-interval '1 second' where ride_id=$1", [ride.id]);
    const done = await courier.client.rpc("complete_delivery", { p_ride: ride.id, p_code: code, p_photo_path: path });
    expect(done.data.ride.status).toBe("completed");
    expect(Number(done.data.ride.price_final)).toBe(1150);
    const ledger = await serviceSql("select -sum(amount_signed) as c from public.ledger where ride_id=$1 and kind='commission_due'", [ride.id]);
    expect(Number(ledger.rows[0].c)).toBe(175);
    expect((await sender.client.storage.from("delivery-proofs").download(path)).error).toBeNull();
    expect((await stranger.client.storage.from("delivery-proofs").download(path)).error).not.toBeNull();
  });

  it("rétention : coordonnées effacées après le délai, clôture automatique sans effet sur une livraison", async () => {
    const ride = await carried();
    await serviceSql("update public.rides set started_at=now()-interval '10 hours' where id=$1", [ride.id]);
    await serviceSql("select set_config('request.jwt.claims','{\"role\":\"service_role\"}',true), public.auto_complete_stale_rides()");
    expect((await serviceSql("select status from public.rides where id=$1", [ride.id])).rows[0].status).toBe("started");
    await serviceSql("update public.rides set status='cancelled_driver',completed_at=now()-interval '31 days' where id=$1", [ride.id]);
    await serviceSql("select public.purge_parcel_recipients()");
    const erased = await serviceSql("select recipient_name,recipient_phone,erased_at from public.ride_parcels where ride_id=$1", [ride.id]);
    expect(erased.rows[0].recipient_name).toBe("effacé");
    expect(erased.rows[0].recipient_phone).toBe("");
    expect(erased.rows[0].erased_at).not.toBeNull();
  });
});

describe("livraison et modification de trajet", () => {
  it("une livraison ne se modifie pas en cours de route", async () => {
    const ride = await carried();
    const change = await admin.rpc("create_route_change_quote", {
      p_ride: ride.id, p_client: sender.id, p_dest: { lon: 9.48, lat: 0.42 }, p_stops: [],
      p_route: { distance_m: 4000, duration_s: 600, shape: "_p~iF~ps|U_ulLnnqC" },
    });
    expect(change.error?.message).toBe("Trajet non modifiable à ce stade");
  });
});
