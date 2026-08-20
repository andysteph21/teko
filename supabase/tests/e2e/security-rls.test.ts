// Sécurité : la base doit dire non. RLS, gardes anti-escalade, RPC réservées.
//
// État actuel important (écart E-15, docs/architecture/08-ecarts-backend-ux.md) :
// aucun grant DML n'est posé pour les rôles API — TOUT accès direct aux tables
// est refusé (42501) avant même l'évaluation RLS. Les tests `it.fails` décrivent
// le comportement désiré une fois les grants posés et se signaleront d'eux-mêmes.

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
  boris = await createDriver(["eco"]);
  const ride = await requestRide(nadia.client);
  rideId = ride.id;
});

describe("surface d'accès actuelle (écart E-15)", () => {
  it("toute lecture directe de table est refusée aux rôles API (42501)", async () => {
    const asClient = await nadia.client.from("rides").select("id").eq("id", rideId);
    expect(asClient.error?.code).toBe("42501");
    const asDriver = await boris.client.from("ledger").select("id");
    expect(asDriver.error?.code).toBe("42501");
  });

  it.fails("désiré : Nadia lit sa propre course via RLS (à activer avec les grants)", async () => {
    const { data, error } = await nadia.client
      .from("rides")
      .select("id, status")
      .eq("id", rideId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it.fails("désiré : un chauffeur non assigné ne voit pas la course d'autrui mais peut lire les tables (E-01/E-15)", async () => {
    const { data, error } = await boris.client
      .from("rides")
      .select("id")
      .eq("id", rideId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe("RPC et gardes", () => {
  it("un tiers ne peut pas annuler la course de Nadia", async () => {
    const { error } = await paul.client.rpc("cancel_ride", { p_ride: rideId });
    expect(error?.message).toMatch(/non autorisé/i);
  });

  it("Nadia ne peut pas se promouvoir admin", async () => {
    const { error } = await nadia.client
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", nadia.id);
    // Aujourd'hui bloqué par l'absence de grant (42501) ; avec les grants,
    // le trigger guard_profile_role_change prendra le relais. Dans les deux
    // cas : refus.
    expect(error).not.toBeNull();
  });

  it("Boris ne peut pas truquer son solde affiché", async () => {
    const { error } = await boris.client
      .from("drivers")
      .update({ current_balance_cache: 999999 })
      .eq("id", boris.id);
    expect(error).not.toBeNull();
  });

  it("set_commission est refusée à un client", async () => {
    const { error } = await nadia.client.rpc("set_commission", {
      p_type: "percent",
      p_value: 1,
    });
    expect(error).not.toBeNull();
  });

  // ÉCART E-16 (faille avérée) : daily_close est SECURITY DEFINER sans garde —
  // un client peut aujourd'hui déclencher la clôture comptable. Échec attendu
  // tant que la garde n'est pas posée ; ce test s'inversera de lui-même.
  it.fails("désiré : daily_close est refusée à un client (écart E-16)", async () => {
    const { error } = await nadia.client.rpc("daily_close", {});
    expect(error).not.toBeNull();
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
