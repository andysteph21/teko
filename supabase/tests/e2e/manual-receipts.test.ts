// Vrais JWT Ops/Finance et vrai Storage : aucune preuve ni validation simulée.
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { type TestUser, createDriver, createUser, serviceSql } from "./helpers";

let ops: TestUser;
let finance: TestUser;
let carto: TestUser;
let driver: TestUser;
let passenger: TestUser;
// PNG 1 × 1 valide ; aucun justificatif réel dans le banc de tests.
const proof = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=", "base64");

beforeAll(async () => {
  ops = await createUser({ role: "admin", adminRole: "ops" });
  finance = await createUser({ role: "admin", adminRole: "finance" });
  carto = await createUser({ role: "admin", adminRole: "carto" });
  driver = await createDriver();
  passenger = await createUser();
});

async function upload(user = ops) {
  const path = `${user.id}/${randomUUID()}.png`;
  const result = await user.client.storage.from("finance-proofs").upload(path, proof, { contentType: "image/png" });
  expect(result.error).toBeNull();
  return path;
}

async function prepare(extra: Record<string, unknown> = {}) {
  return ops.client.rpc("prepare_manual_receipt", {
    p_driver: driver.id, p_kind: "settlement", p_amount: 250,
    p_method: "cash", p_reference: `receipt-${randomUUID()}`, p_proof_path: await upload(),
    ...extra,
  });
}

async function balance() {
  const result = await driver.client.rpc("driver_balance", { p_driver: driver.id });
  expect(result.error).toBeNull();
  return Number(result.data);
}

describe("règlements manuels sous contrôle Finance", () => {
  it("Ops prépare sans crédit ; seul Finance approuve, même en concurrence", async () => {
    const initial = await balance();
    const prepared = await prepare();
    expect(prepared.error).toBeNull();
    expect(prepared.data.status).toBe("pending");
    expect(await balance()).toBe(initial);
    for (const user of [ops, carto, driver, passenger]) {
      const denied = await user.client.rpc("approve_manual_receipt", { p_receipt: prepared.data.id });
      expect(denied.error?.code).toBe("42501");
    }
    const approvals = await Promise.all([1, 2, 3].map(() =>
      finance.client.rpc("approve_manual_receipt", { p_receipt: prepared.data.id })));
    for (const result of approvals) {
      expect(result.error).toBeNull();
      expect(result.data.status).toBe("approved");
      expect(result.data.approved_by).toBe(finance.id);
    }
    expect(new Set(approvals.map((result) => result.data.payment_id)).size).toBe(1);
    expect(await balance()).toBe(initial + 250);
    const ledger = await serviceSql("select amount_signed from public.ledger where payment_id=$1", [approvals[0].data.payment_id]);
    expect(ledger.rows).toHaveLength(1);
    expect(Number(ledger.rows[0].amount_signed)).toBe(250);
  });

  it("refuse un justificatif absent et la réutilisation de référence ou de preuve", async () => {
    const missing = await prepare({ p_proof_path: `${ops.id}/missing.png` });
    expect(missing.error?.code).toBe("22023");
    const prepared = await prepare();
    expect(prepared.error).toBeNull();
    const duplicate = await prepare({ p_reference: prepared.data.reference.toLowerCase() });
    expect(duplicate.error?.code).toBe("23505");
    const reused = await prepare({ p_proof_path: prepared.data.proof_path });
    expect(reused.error?.code).toBe("23505");
  });

  it("garde le justificatif privé et interdit son remplacement ou sa suppression", async () => {
    const path = await upload();
    for (const user of [carto, driver, passenger]) {
      const read = await user.client.storage.from("finance-proofs").download(path);
      expect(read.error).not.toBeNull();
      const write = await user.client.storage.from("finance-proofs").upload(`${user.id}/${randomUUID()}.png`, proof, { contentType: "image/png" });
      expect(write.error).not.toBeNull();
    }
    const update = await ops.client.storage.from("finance-proofs").update(path, proof, { contentType: "image/png" });
    expect(update.error).not.toBeNull();
    await ops.client.storage.from("finance-proofs").remove([path]);
    const retained = await finance.client.storage.from("finance-proofs").download(path);
    expect(retained.error).toBeNull();
  });

  it("refuse les écritures directes et les validations de paiement par Ops", async () => {
    const prepared = await prepare();
    expect(prepared.error).toBeNull();
    const direct = await ops.client.from("manual_receipts").update({ status: "approved" }).eq("id", prepared.data.id);
    expect(direct.error).not.toBeNull();
    const internal = await ops.client.rpc("confirm_payment", { p_payment: randomUUID() });
    expect(internal.error).not.toBeNull();
  });

  it("crédite exactement la part figée après encaissement complet, jamais deux fois", async () => {
    const ride = await serviceSql(`insert into public.rides(client_id,driver_id,category,status,
      origin_geom,dest_geom,price_est,payment_method)
      values($1,$2,'eco','accepted',extensions.st_geomfromtext('POINT(9.45 0.4)',4326),
        extensions.st_geomfromtext('POINT(9.47 0.41)',4326),1600,'cash') returning id`, [passenger.id, driver.id]);
    const cancelled = await passenger.client.rpc("cancel_ride", { p_ride: ride.rows[0].id });
    expect(cancelled.error).toBeNull();
    const claims = await driver.client.from("cancellation_claims").select("*").eq("ride_id", ride.rows[0].id).single();
    expect(claims.error).toBeNull();
    expect(Number(claims.data.amount)).toBe(325);
    expect(Number(claims.data.driver_share)).toBe(225);
    const before = await balance();
    const partial = await prepare({ p_kind: "cancellation_fee", p_claim: claims.data.id, p_amount: 100 });
    expect(partial.error?.code).toBe("22023");
    const receipt = await prepare({ p_kind: "cancellation_fee", p_claim: claims.data.id, p_amount: 325, p_method: "external_transfer" });
    expect(receipt.error).toBeNull();
    expect(await balance()).toBe(before);
    const approved = await finance.client.rpc("approve_manual_receipt", { p_receipt: receipt.data.id });
    expect(approved.error).toBeNull();
    expect(await balance()).toBe(before + 225);
    const second = await prepare({ p_kind: "cancellation_fee", p_claim: claims.data.id, p_amount: 325 });
    expect(second.error?.code).toBe("22023");
    const own = await driver.client.from("cancellation_claims").select("status").eq("id", claims.data.id).single();
    expect(own.data.status).toBe("collected");
  });

  it("refuse un versement au-delà du solde et débite une seule fois le versement réel", async () => {
    const before = await balance();
    const excessive = await prepare({ p_kind: "payout", p_amount: before + 25 });
    expect(excessive.error).toBeNull();
    const denied = await finance.client.rpc("approve_manual_receipt", { p_receipt: excessive.data.id });
    expect(denied.error?.code).toBe("22023");
    expect(await balance()).toBe(before);
    const receipt = await prepare({ p_kind: "payout", p_amount: before });
    expect(receipt.error).toBeNull();
    const approved = await finance.client.rpc("approve_manual_receipt", { p_receipt: receipt.data.id });
    expect(approved.error).toBeNull();
    expect(await balance()).toBe(0);
  });
});
