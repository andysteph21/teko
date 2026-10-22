// Régressions adversariales : vraie API, JWT ordinaires, contrôle de l'état.
// Fixtures privilégiées uniquement ; aucune action testée ne passe en service.
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  API_URL, ANON_KEY, db, type TestUser, createDriver, createUser, serviceSql,
} from "./helpers";

let passenger: TestUser;
let driver: TestUser;
let outsider: TestUser;

beforeAll(async () => {
  passenger = await createUser();
  driver = await createDriver(["eco"]);
  outsider = await createDriver(["eco"]);
});

afterAll(async () => { await db.end(); });

async function fixture(status = "accepted", price = 1600) {
  const r = await serviceSql(
    `insert into public.rides
      (client_id,driver_id,category,status,origin_geom,dest_geom,price_est,pin_code,payment_method)
     values ($1,$2,'eco',$3::public.ride_status,
       extensions.st_geomfromtext('POINT(9.45 0.4)',4326),
       extensions.st_geomfromtext('POINT(9.47 0.41)',4326),$4,'4729','cash') returning id`,
    [passenger.id, driver.id, status, price],
  );
  return r.rows[0].id as string;
}

describe("intégrité de la course sans passer par les RPC", () => {
  it("le passager ne peut pas terminer directement sa course", async () => {
    const id = await fixture();
    const r = await passenger.client.from("rides").update({ status: "completed", price_final: 1 }).eq("id", id);
    expect(r.error).not.toBeNull();
    const row = await serviceSql("select status,price_final from public.rides where id=$1", [id]);
    expect(row.rows[0]).toMatchObject({ status: "accepted", price_final: null });
  });

  it("le chauffeur ne peut pas réécrire le prix convenu", async () => {
    const id = await fixture();
    const r = await driver.client.from("rides").update({ price_est: 999999 }).eq("id", id);
    expect(r.error).not.toBeNull();
    const row = await serviceSql("select price_est from public.rides where id=$1", [id]);
    expect(Number(row.rows[0].price_est)).toBe(1600);
  });

  it("le participant ne peut pas fabriquer un événement métier", async () => {
    const id = await fixture();
    const r = await passenger.client.from("ride_events").insert({ ride_id: id, actor: passenger.id, type: "completed" });
    expect(r.error).not.toBeNull();
    const rows = await serviceSql("select id from public.ride_events where ride_id=$1 and type='completed'", [id]);
    expect(rows.rows).toHaveLength(0);
  });

  it("un utilisateur ne peut pas s'inscrire chauffeur déjà validé et actif", async () => {
    const u = await createUser();
    const r = await u.client.from("drivers").insert({ id: u.id, kyc_status: "validated", is_active: true, categories: ["eco"] });
    expect(r.error).not.toBeNull();
    const rows = await serviceSql("select id from public.drivers where id=$1", [u.id]);
    expect(rows.rows).toHaveLength(0);
  });
});

describe("confidentialité et GPS", () => {
  it("le chauffeur assigné ne lit pas le PIN par SELECT", async () => {
    const id = await fixture();
    const r = await driver.client.from("rides").select("id,pin_code").eq("id", id).single();
    expect(r.error !== null || r.data?.pin_code == null).toBe(true);
  });

  it("la réponse d'arrivée ne révèle pas le PIN au chauffeur", async () => {
    const id = await fixture();
    const r = await driver.client.rpc("mark_arrived", { p_ride: id });
    expect(r.error).toBeNull();
    expect(r.data.status).toBe("arrived");
    expect(r.data.pin_code).toBeNull();
  });

  it("seul le passager récupère le PIN privé et le chauffeur peut le vérifier", async () => {
    const id = await fixture("arrived");
    const own = await passenger.client.rpc("ride_pin", { p_ride: id });
    expect(own.error).toBeNull();
    expect(own.data).toBe("4729");
    for (const caller of [driver, outsider]) {
      const denied = await caller.client.rpc("ride_pin", { p_ride: id });
      expect(denied.error?.code).toBe("42501");
    }
    const started = await driver.client.rpc("start_ride_checked", { p_ride: id, p_pin: own.data });
    expect(started.error).toBeNull();
    expect(started.data.ride.status).toBe("started");
    expect(started.data.ride.pin_code).toBeNull();
  });

  it("un tiers ne peut pas interroger le solde d'un chauffeur", async () => {
    const r = await outsider.client.rpc("driver_balance", { p_driver: driver.id });
    expect(r.error).not.toBeNull();
  });

  it("un tiers ne peut pas injecter sa position dans une course d'autrui", async () => {
    const id = await fixture();
    const r = await outsider.client.from("ride_locations").insert({
      ride_id: id, driver_id: outsider.id, geom: "SRID=4326;POINT(9.45 0.4)",
    });
    expect(r.error).not.toBeNull();
    const rows = await serviceSql("select id from public.ride_locations where ride_id=$1", [id]);
    expect(rows.rows).toHaveLength(0);
  });

  it("le chauffeur assigné peut envoyer sa position pendant la course", async () => {
    const id = await fixture("started");
    const r = await driver.client.from("ride_locations").insert({
      ride_id: id, driver_id: driver.id, geom: "SRID=4326;POINT(9.45 0.4)",
    });
    expect(r.error).toBeNull();
    const rows = await serviceSql("select driver_id from public.ride_locations where ride_id=$1", [id]);
    expect(rows.rows).toEqual([{ driver_id: driver.id }]);
  });
});

describe("autorité du tarif et des opérations internes", () => {
  it.each([[1203, 175], [1450, 225], [750,125]])("la commission des nouvelles courses cash %i est arrondie à %i francs une seule fois", async (price, commission) => {
    const id = await fixture("started", price);
    const before = await serviceSql("select id,amount_signed,balance_after from public.ledger where driver_id=$1 order by id", [driver.id]);
    const results = await Promise.all([
      driver.client.rpc("complete_ride", { p_ride: id }),
      driver.client.rpc("complete_ride", { p_ride: id }),
    ]);
    expect(results.some((r) => r.error === null)).toBe(true);
    const ledger = await serviceSql("select kind,amount_signed,balance_after from public.ledger where ride_id=$1", [id]);
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0].kind).toBe("commission_due");
    expect(Number(ledger.rows[0].amount_signed)).toBe(-commission);
    const previous = before.rows.at(-1);
    expect(Number(ledger.rows[0].balance_after)).toBe(Number(previous?.balance_after ?? 0) - commission);
    const history = await serviceSql("select id,amount_signed,balance_after from public.ledger where driver_id=$1 and ride_id is distinct from $2 order by id", [driver.id, id]);
    expect(history.rows).toEqual(before.rows);
    const ride = await serviceSql("select status,price_final from public.rides where id=$1", [id]);
    expect(ride.rows[0].status).toBe("completed");
    expect(Number(ride.rows[0].price_final)).toBe(price);
  });

  it("un prix final falsifié est refusé sans écriture au grand livre", async () => {
    const id = await fixture("started");
    const r = await driver.client.rpc("complete_ride", { p_ride: id, p_price_final: 1 });
    expect(r.error).not.toBeNull();
    const row = await serviceSql("select status from public.rides where id=$1", [id]);
    expect(row.rows[0].status).toBe("started");
    const ledger = await serviceSql("select id from public.ledger where ride_id=$1", [id]);
    expect(ledger.rows).toHaveLength(0);
  });

  it("la clôture légitime utilise le prix annoncé et prélève 250 XAF", async () => {
    const id = await fixture("started");
    const r = await driver.client.rpc("complete_ride", { p_ride: id });
    expect(r.error).toBeNull();
    expect(Number(r.data.price_final)).toBe(1600);
    const ledger = await serviceSql("select amount_signed from public.ledger where ride_id=$1", [id]);
    expect(ledger.rows).toHaveLength(1);
    expect(Number(ledger.rows[0].amount_signed)).toBe(-250);
  });

  it("l'anonyme ne peut pas lancer la clôture financière", async () => {
    const anon = createClient(API_URL, ANON_KEY!, { auth: { persistSession: false } });
    const r = await anon.rpc("daily_close", {});
    expect(r.error).not.toBeNull();
  });

  it("un utilisateur ne peut pas appeler la transition interne", async () => {
    const id = await fixture();
    const r = await driver.client.rpc("_driver_transition", {
      p_ride: id, p_from: ["accepted"], p_to: "completed", p_event: "completed",
    });
    expect(r.error).not.toBeNull();
    const row = await serviceSql("select status from public.rides where id=$1", [id]);
    expect(row.rows[0].status).toBe("accepted");
  });
});
