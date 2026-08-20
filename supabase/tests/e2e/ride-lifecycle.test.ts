// Parcours cœur : Nadia commande, Boris accepte → arrive → PIN → termine.
// Vérifie à chaque étape comment la base réagit (statuts, événements,
// notifications, ledger).

import { beforeAll, describe, expect, it } from "vitest";
import {
  DISTANCE_M,
  DURATION_S,
  type TestUser,
  createDriver,
  createUser,
  requestRide,
  ridePin,
  serviceSql,
} from "./helpers";

let nadia: TestUser;
let boris: TestUser;
let steeve: TestUser;

beforeAll(async () => {
  nadia = await createUser();
  boris = await createDriver(["eco"]);
  steeve = await createDriver(["eco"]);
});

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

  it("request_ride crée la course en 'requested' avec PIN et prix estimé", async () => {
    const ride = await requestRide(nadia.client);
    rideId = ride.id;
    expect(ride.status).toBe("requested");
    expect(ride.client_id).toBe(nadia.id);
    expect(ride.driver_id).toBeNull();
    expect(Number(ride.price_est)).toBe(priceEst);
    const pin = await ridePin(rideId);
    expect(pin).toMatch(/^\d{4}$/);
  });

  it("accept_ride assigne Boris et notifie Nadia", async () => {
    const { data, error } = await boris.client.rpc("accept_ride", {
      p_ride: rideId,
    });
    expect(error).toBeNull();
    expect(data.status).toBe("accepted");
    expect(data.driver_id).toBe(boris.id);

    const notif = await serviceSql(
      `select type from public.notifications where user_id = $1 and (payload->>'ride_id') = $2`,
      [nadia.id, rideId],
    );
    expect(notif.rows.map((r) => r.type)).toContain("ride_accepted");
  });

  it("un second chauffeur ne peut plus accepter la même course", async () => {
    const { error } = await steeve.client.rpc("accept_ride", {
      p_ride: rideId,
    });
    expect(error?.message).toMatch(/non disponible/i);
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

    // Commission 15 % (seed) due par le chauffeur qui a encaissé le cash.
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
    for (const t of ["requested", "accepted", "arrived", "started", "completed"]) {
      expect(types).toContain(t);
    }
    expect(types.indexOf("accepted")).toBeLessThan(types.indexOf("started"));
    expect(types.indexOf("started")).toBeLessThan(types.indexOf("completed"));
  });

  // ÉCART E-15 (docs/architecture/08) : aucun grant DML sur les tables — la
  // politique RLS ratings_insert_participant est inatteignable. Ce test décrit
  // le comportement DÉSIRÉ ; `it.fails` le marque en échec attendu et se
  // mettra à hurler (donc à inverser) quand les grants seront posés.
  it.fails("Nadia peut noter la course (bloqué aujourd'hui : écart E-15)", async () => {
    const r = await nadia.client.from("ratings").insert({
      ride_id: rideId,
      from_user: nadia.id,
      to_user: boris.id,
      stars: 5,
    });
    expect(r.error).toBeNull();
  });
});

describe("annulation", () => {
  it("le client peut annuler une course demandée → cancelled_client", async () => {
    const ride = await requestRide(nadia.client);
    const { data, error } = await nadia.client.rpc("cancel_ride", {
      p_ride: ride.id,
      p_reason: "changement de plan",
    });
    expect(error).toBeNull();
    expect(data.status).toBe("cancelled_client");
  });

  it("le chauffeur assigné peut déclarer un no_show", async () => {
    const ride = await requestRide(nadia.client);
    await boris.client.rpc("accept_ride", { p_ride: ride.id });
    const { data, error } = await boris.client.rpc("cancel_ride", {
      p_ride: ride.id,
      p_status: "no_show",
    });
    expect(error).toBeNull();
    expect(data.status).toBe("no_show");
    // Écart connu E-03 : aucun frais d'annulation n'est posté au ledger
    // (docs/architecture/08-ecarts-backend-ux.md). Ce test documente l'état
    // actuel et devra être renforcé quand cancel_ride postera le frais.
    const fee = await serviceSql(
      `select 1 from public.ledger where ride_id = $1 and kind = 'cancellation'`,
      [ride.id],
    );
    expect(fee.rows).toHaveLength(0);
  });
});
