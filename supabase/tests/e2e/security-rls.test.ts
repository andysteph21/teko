// Sécurité : la base doit dire non — et dire oui au bon endroit.
// E-15 comblé : les rôles API ont le DML, la RLS fait désormais l'isolation.
// E-16 comblé : daily_close et les fonctions internes sont gardées.

import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type TestUser,
  createDriver,
  createUser,
  requestRide,
  serviceSql,
} from "./helpers";

let nadia: TestUser;
let paul: TestUser;
let boris: TestUser;
let rideId: string;

beforeAll(async () => {
  nadia = await createUser();
  paul = await createUser();
  boris = await createDriver(["eco"]); // hors ligne : aucune offre ne lui parvient
  const ride = await requestRide(nadia.client);
  rideId = ride.id;
});

describe("isolation RLS (E-15 comblé)", () => {
  it("Nadia lit sa propre course", async () => {
    const { data, error } = await nadia.client
      .from("rides")
      .select("id, status")
      .eq("id", rideId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("un autre client ne voit pas la course de Nadia", async () => {
    const { data, error } = await paul.client
      .from("rides")
      .select("id")
      .eq("id", rideId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("un chauffeur sans offre ni assignation ne voit pas la course", async () => {
    const { data, error } = await boris.client
      .from("rides")
      .select("id")
      .eq("id", rideId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("anonyme : aucun accès aux tables (aucun grant)", async () => {
    const anon = createClient(
      process.env.SUPABASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:54321",
      (process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY)!,
      { auth: { persistSession: false } },
    );
    const { error } = await anon.from("rides").select("id");
    expect(error?.code).toBe("42501");
  });

  it("un client ne lit pas le ledger ; un chauffeur ne lit que le sien", async () => {
    const asClient = await nadia.client.from("ledger").select("id");
    expect(asClient.error).toBeNull();
    expect(asClient.data).toHaveLength(0);
    const asDriver = await boris.client
      .from("ledger")
      .select("driver_id")
      .neq("driver_id", boris.id);
    expect(asDriver.error).toBeNull();
    expect(asDriver.data).toHaveLength(0);
  });
});

describe("gardes anti-escalade et fonctions internes", () => {
  it("Nadia ne peut pas se promouvoir admin (garde de rôle)", async () => {
    const { error } = await nadia.client
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", nadia.id);
    expect(error?.message).toMatch(/rôle non autorisée/i);
  });

  it("Boris ne peut pas truquer son solde affiché (garde champs sensibles)", async () => {
    const { error } = await boris.client
      .from("drivers")
      .update({ current_balance_cache: 999999 })
      .eq("id", boris.id);
    expect(error?.code).toBe("42501");
    const actual = await serviceSql("select current_balance_cache from public.drivers where id=$1", [boris.id]);
    expect(Number(actual.rows[0].current_balance_cache)).toBe(0);
  });

  it("les fonctions internes ne sont plus exécutables par un utilisateur", async () => {
    const postLedger = await nadia.client.rpc("post_ledger", {
      p_driver: boris.id,
      p_kind: "adjustment",
      p_amount: 100000,
    });
    expect(postLedger.error?.code).toBe("42501");
    const serviceMode = await nadia.client.rpc("set_service_mode", {
      p_on: true,
    });
    expect(serviceMode.error?.code).toBe("42501");
    const confirm = await nadia.client.rpc("confirm_payment", {
      p_payment: "00000000-0000-0000-0000-000000000000",
    });
    expect(confirm.error?.code).toBe("42501");
  });

  it("set_commission est refusée à un client", async () => {
    const { error } = await nadia.client.rpc("set_commission", {
      p_type: "percent",
      p_value: 1,
    });
    expect(error).not.toBeNull();
  });

  it("daily_close est refusée à un client (E-16 comblé)", async () => {
    const { error } = await nadia.client.rpc("daily_close", {});
    expect(error?.code).toBe("42501");
  });

  it("un tiers ne peut pas annuler la course de Nadia", async () => {
    const { error } = await paul.client.rpc("cancel_ride", { p_ride: rideId });
    expect(error?.message).toMatch(/non autorisé/i);
  });

  it("le ledger est immuable même pour son propriétaire", async () => {
    await serviceSql(`select public.post_ledger($1, 'adjustment', -100)`, [
      boris.id,
    ]);
    const before = await serviceSql(
      `select count(*)::int as n, sum(amount_signed)::numeric as s from public.ledger where driver_id = $1`,
      [boris.id],
    );
    await boris.client.from("ledger").delete().eq("driver_id", boris.id);
    await boris.client
      .from("ledger")
      .update({ amount_signed: 0 })
      .eq("driver_id", boris.id);
    const after = await serviceSql(
      `select count(*)::int as n, sum(amount_signed)::numeric as s from public.ledger where driver_id = $1`,
      [boris.id],
    );
    expect(after.rows[0]).toEqual(before.rows[0]);
  });
});
