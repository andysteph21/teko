// Dispatch par offres (E-01 comblé) : proximité, cascade sur refus,
// expiration, épuisement.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestUser,
  createDriver,
  createUser,
  goOnline,
  pendingOffer,
  requestRide,
  serviceSql,
  allOffline,
} from "./helpers";

let nadia: TestUser;
let near: TestUser; // ~100 m du départ
let far: TestUser; //  ~2 km du départ

beforeAll(async () => {
  nadia = await createUser();
  near = await createDriver(["eco"]);
  far = await createDriver(["eco"]);
  await goOnline(near, 9.4538, 0.4035);
  await goOnline(far, 9.47, 0.42);
});

afterAll(allOffline);

describe("dispatch par offres", () => {
  it("l'offre part vers le chauffeur le plus proche, avec échéance", async () => {
    const ride = await requestRide(nadia.client);
    const offNear = await pendingOffer(near, ride.id);
    const offFar = await pendingOffer(far, ride.id);
    expect(offNear).not.toBeNull();
    expect(offFar).toBeNull();
    expect(new Date(offNear.expires_at).getTime()).toBeGreaterThan(Date.now());

    // Nettoyage : on libère la course pour ne pas parasiter la suite.
    await nadia.client.rpc("cancel_ride", { p_ride: ride.id });
  });

  it("refus → cascade vers le suivant, qui peut accepter", async () => {
    const ride = await requestRide(nadia.client);
    const off1 = await pendingOffer(near, ride.id);
    const decline = await near.client.rpc("respond_offer", {
      p_offer: off1.id,
      p_accept: false,
    });
    expect(decline.error).toBeNull();

    const off2 = await pendingOffer(far, ride.id);
    expect(off2).not.toBeNull();
    expect(off2.rank).toBe(2);

    const { data, error } = await far.client.rpc("respond_offer", {
      p_offer: off2.id,
      p_accept: true,
    });
    expect(error).toBeNull();
    expect(data.driver_id).toBe(far.id);
    expect(data.status).toBe("accepted");

    const ev = await serviceSql(
      `select type from public.ride_events where ride_id = $1 order by at`,
      [ride.id],
    );
    const types = ev.rows.map((r) => r.type);
    expect(types).toContain("offer_declined");
    expect(types.filter((t) => t === "offer_sent")).toHaveLength(2);
    await far.client.rpc("cancel_ride", { p_ride: ride.id, p_status: "cancelled_driver" });
  });

  it("expiration (job) → cascade automatique vers le suivant", async () => {
    const ride = await requestRide(nadia.client);
    const off1 = await pendingOffer(near, ride.id);
    await serviceSql(
      `update public.ride_offers set expires_at = now() - interval '1 second' where id = $1`,
      [off1.id],
    );
    const expired = await serviceSql(`select public.expire_stale_offers() as n`);
    expect(Number(expired.rows[0].n)).toBeGreaterThanOrEqual(1);

    const st = await serviceSql(
      `select status from public.ride_offers where id = $1`,
      [off1.id],
    );
    expect(st.rows[0].status).toBe("expired");
    expect(await pendingOffer(far, ride.id)).not.toBeNull();
    await nadia.client.rpc("cancel_ride", { p_ride: ride.id });
  });

  it("aucun chauffeur éligible → client prévenu, course annulable sans frais", async () => {
    const ride = await requestRide(nadia.client, { p_category: "confort" });
    const ev = await serviceSql(
      `select 1 from public.ride_events where ride_id = $1 and type = 'dispatch_exhausted'`,
      [ride.id],
    );
    expect(ev.rows).toHaveLength(1);
    const notif = await serviceSql(
      `select 1 from public.notifications where user_id = $1 and type = 'no_driver_found' and (payload->>'ride_id') = $2`,
      [nadia.id, ride.id],
    );
    expect(notif.rows).toHaveLength(1);
    const { data } = await nadia.client.rpc("cancel_ride", { p_ride: ride.id });
    expect(data.status).toBe("cancelled_client");
  });

  it("une offre déjà traitée ne peut pas être rejouée", async () => {
    const ride = await requestRide(nadia.client);
    const off = await pendingOffer(near, ride.id);
    await near.client.rpc("respond_offer", { p_offer: off.id, p_accept: true });
    const replay = await near.client.rpc("respond_offer", {
      p_offer: off.id,
      p_accept: true,
    });
    expect(replay.error?.message).toMatch(/déjà traitée/i);
    await near.client.rpc("cancel_ride", { p_ride: ride.id, p_status: "cancelled_driver" });
  });
});
