import { randomUUID } from "node:crypto";
import { beforeAll, expect, it } from "vitest";
import { type TestUser, createDriver, createUser, serviceSql } from "./helpers";

let ops: TestUser;
let finance: TestUser;
let driver: TestUser;
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=", "base64");
beforeAll(async () => {
  ops = await createUser({ role: "admin", adminRole: "ops" });
  finance = await createUser({ role: "admin", adminRole: "finance" });
  driver = await createDriver();
});
async function proof() {
  const path = `${ops.id}/${randomUUID()}.png`;
  expect((await ops.client.storage.from("finance-proofs").upload(path, image, { contentType: "image/png" })).error).toBeNull();
  return path;
}
async function prepare(amount: number, method = "cash", reference = `step-${randomUUID()}`) {
  return ops.client.rpc("prepare_manual_receipt", {
    p_driver: driver.id, p_kind: "settlement", p_amount: amount, p_method: method,
    p_reference: reference, p_proof_path: await proof(),
  });
}
async function balance() {
  const result = await driver.client.rpc("driver_balance", { p_driver: driver.id });
  expect(result.error).toBeNull();
  return Number(result.data);
}

it.each(["cash", "external_transfer"])("refuse un nouveau justificatif hors pas de 25 en %s, sans arrondi ni effet financier", async (method) => {
  const before = await balance();
  for (const amount of [240, 249.999, 250.001]) {
    const reference = `step-${randomUUID()}`;
    const result = await prepare(amount, method, reference);
    expect(result.error?.code).toBe("22023");
    expect(result.error?.message).toBe("Le montant doit être positif et multiple de 25 FCFA");
    const receipts = await serviceSql("select id from public.manual_receipts where reference=upper($1)", [reference]);
    expect(receipts.rows).toHaveLength(0);
  }
  expect(await balance()).toBe(before);
});

it.each(["cash", "external_transfer"])("prépare exactement 250 en %s, sans crédit avant Finance puis une seule écriture", async (method) => {
  const before = await balance();
  const prepared = await prepare(250, method);
  expect(prepared.error).toBeNull();
  expect(Number(prepared.data.amount)).toBe(250);
  expect(await balance()).toBe(before);
  const approvals = await Promise.all([1, 2].map(() => finance.client.rpc("approve_manual_receipt", { p_receipt: prepared.data.id })));
  expect(approvals.map((r) => r.error)).toEqual([null, null]);
  expect(approvals[0].data.payment_id).toBe(approvals[1].data.payment_id);
  expect(await balance()).toBe(before + 250);
  const ledger = await serviceSql("select amount_signed from public.ledger where payment_id=$1", [approvals[0].data.payment_id]);
  expect(ledger.rows.map((row) => Number(row.amount_signed))).toEqual([250]);
});

it("refuse une révision hors pas de 25 en conservant référence, preuve et historique", async () => {
  const prepared = await prepare(250);
  expect(prepared.error).toBeNull();
  expect((await finance.client.rpc("reject_manual_receipt", { p_receipt: prepared.data.id, p_reason: "Preuve à corriger" })).error).toBeNull();
  const before = await balance();
  const path = await proof();
  const denied = await ops.client.rpc("revise_manual_receipt", { p_receipt: prepared.data.id, p_amount: 240, p_method: "external_transfer", p_proof_path: path });
  expect(denied.error?.code).toBe("22023");
  const unchanged = await ops.client.from("manual_receipts").select("id,version,status,amount,proof_path").eq("reference", prepared.data.reference);
  expect(unchanged.error).toBeNull();
  expect(unchanged.data).toHaveLength(1);
  expect(unchanged.data![0]).toMatchObject({ id: prepared.data.id, version: 1, status: "rejected", proof_path: prepared.data.proof_path });
  expect(Number(unchanged.data![0].amount)).toBe(250);
  expect(await balance()).toBe(before);
  const revised = await ops.client.rpc("revise_manual_receipt", { p_receipt: prepared.data.id, p_amount: 275, p_method: "external_transfer", p_proof_path: path });
  expect(revised.error).toBeNull();
  expect(revised.data).toMatchObject({ reference: prepared.data.reference, version: 2, previous_receipt_id: prepared.data.id });
  expect(Number(revised.data.amount)).toBe(275);
});

it("un dossier antérieur hors pas reste approuvable sans réécriture de son montant", async () => {
  // Précondition historique créée au service, jamais via le contrat usager nouveau.
  const path = await proof();
  const inserted = await serviceSql(`insert into public.manual_receipts(driver_id,kind,amount,method,reference,proof_path,created_by,created_at)
    values($1,'settlement',240,'cash',$2,$3,$4,'2026-10-18T00:00:00Z') returning id`,
    [driver.id, `LEGACY-${randomUUID()}`, path, ops.id]);
  const before = await balance();
  const approved = await finance.client.rpc("approve_manual_receipt", { p_receipt: inserted.rows[0].id });
  expect(approved.error).toBeNull();
  expect(Number(approved.data.amount)).toBe(240);
  expect(await balance()).toBe(before + 240);
  const ledger = await serviceSql("select amount_signed from public.ledger where payment_id=$1", [approved.data.payment_id]);
  expect(ledger.rows.map((row) => Number(row.amount_signed))).toEqual([240]);
});
