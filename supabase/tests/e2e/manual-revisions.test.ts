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

it("refus motivé, révision concurrente unique et une seule écriture financière pour toute la référence", async () => {
  const prepared = await ops.client.rpc("prepare_manual_receipt", {
    p_driver: driver.id, p_kind: "settlement", p_amount: 250, p_method: "cash",
    p_reference: `revision-${randomUUID()}`, p_proof_path: await proof(),
  });
  expect(prepared.error).toBeNull();
  const id = prepared.data.id;
  expect((await ops.client.rpc("reject_manual_receipt", { p_receipt: id, p_reason: "Illisible" })).error?.code).toBe("42501");
  expect((await finance.client.rpc("reject_manual_receipt", { p_receipt: id, p_reason: " " })).error?.code).toBe("22023");
  const refused = await finance.client.rpc("reject_manual_receipt", { p_receipt: id, p_reason: "Reçu illisible" });
  expect(refused.error).toBeNull();
  expect(refused.data).toMatchObject({ status: "rejected", rejection_reason: "Reçu illisible", rejected_by: finance.id });
  expect((await finance.client.rpc("approve_manual_receipt", { p_receipt: id })).error?.code).toBe("22023");
  const revised = await Promise.all([await proof(), await proof()].map((path) => ops.client.rpc("revise_manual_receipt", {
    p_receipt: id, p_amount: 300, p_method: "external_transfer", p_proof_path: path,
  })));
  expect(revised.filter((r) => r.error === null)).toHaveLength(1);
  expect(revised.filter((r) => r.error?.code === "22023")).toHaveLength(1);
  const version = revised.find((r) => r.error === null)!.data;
  expect(version).toMatchObject({ version: 2, reference: prepared.data.reference, previous_receipt_id: id, status: "pending" });
  expect(version.proof_path).not.toBe(prepared.data.proof_path);
  const approved = await Promise.all([1,2].map(() => finance.client.rpc("approve_manual_receipt", { p_receipt: version.id })));
  for (const result of approved) expect(result.error).toBeNull();
  expect(approved[0].data.payment_id).toBe(approved[1].data.payment_id);
  const ledger = await serviceSql("select amount_signed from public.ledger where payment_id=$1", [approved[0].data.payment_id]);
  expect(ledger.rows).toHaveLength(1);
  expect(Number(ledger.rows[0].amount_signed)).toBe(300);
  const history = await ops.client.from("manual_receipts").select("status,version,rejection_reason").eq("reference", version.reference).order("version");
  expect(history.error).toBeNull();
  expect(history.data).toEqual([
    { status: "rejected", version: 1, rejection_reason: "Reçu illisible" },
    { status: "approved", version: 2, rejection_reason: null },
  ]);
});
