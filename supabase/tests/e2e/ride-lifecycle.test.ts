// Parcours cœur : Nadia commande, l'offre part vers Boris (dispatch E-01),
// Boris accepte → arrive → PIN → termine. Vérifie à chaque étape comment la
// base réagit (statuts, offres, événements, notifications, ledger).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DISTANCE_M,
  DURATION_S,
  type TestUser,
  createDriver,
  createUser,
  goOnline,
  pendingOffer,
  requestRide,
  ridePin,
  serviceSql,
  allOffline,
} from "./helpers";

let nadia: TestUser;
let boris: TestUser;
let steeve: TestUser;

beforeAll(async () => {
  nadia = await createUser();
  boris = await createDriver(["eco"]);
  steeve = await createDriver(["eco"]);
  // Boris est en ligne près du départ ; Steeve reste hors ligne (pas de
  // heartbeat) : le dispatch ne doit adresser l'offre qu'à Boris.
  await goOnline(boris, 9.4535, 0.4031);
});

afterAll(allOffline);

describe("cycle de vie d'une course cash", () => {
  let rideId: string;
  let priceEst: number;

  it("estime le prix selon le barème seed (éco : 500 + 250/km + 25/min)", async () => {
    const { data, error } = await nadia.client.rpc("estimate_price", {
      p_category: "eco",
      p_distance_m: DISTANCE_M,
      p_duration_s: DURATION_S,
    });
    expect(error).toBeNull();
    priceEst = Number(data);
    expect(priceEst).toBe(500 + 250 * 3.2 + 25 * 12); // 1600 XAF
  });

  it("request_ride crée la course et déclenche une offre vers Boris (en ligne)", async () => {
    const ride = await requestRide(nadia.client);
    rideId = ride.id;
    expect(ride.status).toBe("requested");
    expect(ride.driver_id).toBeNull();
    expect(Number(ride.price_est)).toBe(priceEst);
    expect(await ridePin(rideId)).toMatch(/^\d{4}$/);

    const offer = await pendingOffer(boris, rideId);
    expect(offer).not.toBeNull();
    expect(offer.rank).toBe(1);
    const notif = await serviceSql(
      `select 1 from public.notifications where user_id = $1 and type = 'ride_offer'`,
      [boris.id],
    );
    expect(notif.rows.length).toBeGreaterThan(0);
  });

  it("offer_details donne prix/commission/net mais JAMAIS la destination", async () => {
    const offer = await pendingOffer(boris, rideId);
    const { data, error } = await boris.client.rpc("offer_details", {
      p_offer: offer.id,
    });
    expect(error).toBeNull();
    expect(Number(data.price_est)).toBe(priceEst);
    expect(Number(data.commission)).toBe(priceEst * 0.15);
    expect(Number(data.net_driver)).toBe(priceEst * 0.85);
    expect(Object.keys(data).join(",")).not.toMatch(/dest/);
  });

  it("Steeve, sans offre, ne peut pas accepter la course", async () => {
    const { error } = await steeve.client.rpc("accept_ride", {
      p_ride: rideId,
    });
    expect(error?.message).toMatch(/aucune offre active/i);
  });

  it("accept_ride (via l'offre) assigne Boris et notifie Nadia", async () => {
    const { data, error } = await boris.client.rpc("accept_ride", {
      p_ride: rideId,
    });
    expect(error).toBeNull();
    expect(data.status).toBe("accepted");
    expect(data.driver_id).toBe(boris.id);

    const off = await serviceSql(
      `select status from public.ride_offers where ride_id = $1 and driver_id = $2`,
      [rideId, boris.id],
    );
    expect(off.rows[0].status).toBe("accepted");
    const notif = await serviceSql(
      `select type from public.notifications where user_id = $1 and (payload->>'ride_id') = $2`,
      [nadia.id, rideId],
    );
    expect(notif.rows.map((r) => r.type)).toContain("ride_accepted");
  });

  it("start_ride refuse un mauvais PIN puis démarre avec le bon", async () => {
    let r = await boris.client.rpc("mark_arrived", { p_ride: rideId });
    expect(r.error).toBeNull();
    expect(r.data.status).toBe("arrived");

    r = await boris.client.rpc("start_ride", { p_ride: rideId, p_pin: "0000" });
    expect(r.error).not.toBeNull();

    r = await boris.client.rpc("start_ride", {
      p_ride: rideId,
      p_pin: await ridePin(rideId),
    });
    expect(r.error).toBeNull();
    expect(r.data.status).toBe("started");
  });

  it("complete_ride clôture la course et poste la commission au ledger (cash)", async () => {
    const { data, error } = await boris.client.rpc("complete_ride", {
      p_ride: rideId,
    });
    expect(error).toBeNull();
    expect(data.status).toBe("completed");
    expect(Number(data.price_final)).toBe(priceEst);

    const ledger = await serviceSql(
      `select kind, amount_signed from public.ledger where driver_id = $1 and ride_id = $2`,
      [boris.id, rideId],
    );
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0].kind).toBe("commission_due");
    expect(Number(ledger.rows[0].amount_signed)).toBe(-priceEst * 0.15);
  });

  it("ride_events journalise la séquence complète, dans l'ordre", async () => {
    const ev = await serviceSql(
      `select type from public.ride_events where ride_id = $1 order by at, type`,
      [rideId],
    );
    const types = ev.rows.map((r) => r.type);
    for (const t of ["requested", "offer_sent", "accepted", "arrived", "started", "completed"]) {
      expect(types).toContain(t);
    }
    expect(types.indexOf("accepted")).toBeLessThan(types.indexOf("started"));
    expect(types.indexOf("started")).toBeLessThan(types.indexOf("completed"));
  });

  it("Nadia note la course (5 étoiles), une seule fois — E-15 comblé", async () => {
    let r = await nadia.client.from("ratings").insert({
      ride_id: rideId,
      from_user: nadia.id,
      to_user: boris.id,
      stars: 5,
    });
    expect(r.error).toBeNull();
    r = await nadia.client.from("ratings").insert({
      ride_id: rideId,
      from_user: nadia.id,
      to_user: boris.id,
      stars: 1,
    });
    expect(r.error).not.toBeNull(); // unique (ride_id, from_user)
  });
});

describe("annulation et frais (E-03 comblé)", () => {
  it("annulation avant acceptation : sans frais", async () => {
    const ride = await requestRide(nadia.client);
    const { data, error } = await nadia.client.rpc("cancel_ride", {
      p_ride: ride.id,
      p_reason: "changement de plan",
    });
    expect(error).toBeNull();
    expect(data.status).toBe("cancelled_client");
    const fee = await serviceSql(
      `select 1 from public.ledger where ride_id = $1 and kind = 'cancellation'`,
      [ride.id],
    );
    expect(fee.rows).toHaveLength(0);
  });

  it("annulation client après acceptation : max(300 F, 20 %) dû, 70 % crédités au chauffeur", async () => {
    const ride = await requestRide(nadia.client);
    await boris.client.rpc("accept_ride", { p_ride: ride.id });
    const { error } = await nadia.client.rpc("cancel_ride", { p_ride: ride.id });
    expect(error).toBeNull();

    const fee = await serviceSql(
      `select amount_signed from public.ledger where ride_id = $1 and kind = 'cancellation'`,
      [ride.id],
    );
    // Frais dû par le client : max(300, 20 % × 1600) = 320 XAF ; part chauffeur
    // 70 % (décision client n° 5) : round(320 × 0,7) = 224 au grand livre.
    expect(fee.rows).toHaveLength(1);
    expect(Number(fee.rows[0].amount_signed)).toBe(224);

    const notif = await serviceSql(
      `select payload->>'fee' as fee from public.notifications where user_id = $1 and type = 'cancellation_fee' and (payload->>'ride_id') = $2`,
      [nadia.id, ride.id],
    );
    expect(notif.rows).toHaveLength(1);
    expect(Number(notif.rows[0].fee)).toBe(320); // le client doit le frais entier

    const event = await serviceSql(
      `select meta->>'fee' as fee, meta->>'driver_share' as share from public.ride_events where ride_id = $1 and type = 'cancelled'`,
      [ride.id],
    );
    expect(Number(event.rows[0].fee)).toBe(320);
    expect(Number(event.rows[0].share)).toBe(224);
  });

  it("no_show déclaré par le chauffeur : frais dédié (1 000 F, config), 70 % au chauffeur", async () => {
    const ride = await requestRide(nadia.client);
    await boris.client.rpc("accept_ride", { p_ride: ride.id });
    const { data, error } = await boris.client.rpc("cancel_ride", {
      p_ride: ride.id,
      p_status: "no_show",
    });
    expect(error).toBeNull();
    expect(data.status).toBe("no_show");
    const fee = await serviceSql(
      `select amount_signed from public.ledger where ride_id = $1 and kind = 'cancellation'`,
      [ride.id],
    );
    expect(fee.rows).toHaveLength(1);
    expect(Number(fee.rows[0].amount_signed)).toBe(700);
  });
});
