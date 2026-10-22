import { randomUUID } from "node:crypto";
import { beforeAll, expect, it } from "vitest";
import { type TestUser, createUser, createDriver, serviceSql } from "./helpers";

let finance: TestUser;
let driver: TestUser;
let superadmin: TestUser;
beforeAll(async () => {
  finance = await createUser({ role: "admin", adminRole: "finance" });
  driver = await createDriver();
  superadmin = await createUser({ role: "admin", adminRole: "superadmin" });
  await serviceSql("select public.post_ledger($1,'cancellation',700)", [driver.id]);
});

it("la clôture répétée prépare un seul versement sans Airtel ni statut payé", async () => {
  for (let n=0;n<2;n++) {
    const closed = await superadmin.client.rpc("daily_close", {});
    expect(closed.error).toBeNull();
  }
  const pending = await driver.client.from("payout_requests").select("*").eq("driver_id", driver.id);
  expect(pending.error).toBeNull();
  expect(pending.data).toHaveLength(1);
  expect(pending.data[0].status).toBe("pending");
  expect(Number(pending.data[0].amount)).toBe(700);
  const statement = await serviceSql("select status from public.daily_statements where driver_id=$1", [driver.id]);
  expect(statement.rows[0].status).toBe("open");
  const payments = await serviceSql("select id from public.payments where driver_id=$1", [driver.id]);
  expect(payments.rows).toHaveLength(0);
  expect(Number((await driver.client.rpc("driver_balance", { p_driver: driver.id })).data)).toBe(700);
});

it("seule la validation du justificatif débite le solde et marque le versement payé", async () => {
  const pending = await finance.client.from("payout_requests").select("*").eq("driver_id", driver.id).single();
  expect(pending.error).toBeNull();
  const path = `${finance.id}/${randomUUID()}.pdf`;
  const upload = await finance.client.storage.from("finance-proofs").upload(path,
    Buffer.from("%PDF-1.4\n% justificatif fictif de test\n%%EOF"), { contentType: "application/pdf" });
  expect(upload.error).toBeNull();
  const prepared = await finance.client.rpc("prepare_payout_receipt", {
    p_request: pending.data.id,p_method: "cash",p_reference: `cash-${randomUUID()}`,p_proof_path: path,
  });
  expect(prepared.error).toBeNull();
  const paid = await finance.client.rpc("approve_manual_receipt", { p_receipt: prepared.data.id });
  expect(paid.error).toBeNull();
  expect(Number((await driver.client.rpc("driver_balance", { p_driver: driver.id })).data)).toBe(0);
  const request = await finance.client.from("payout_requests").select("status").eq("id", pending.data.id).single();
  expect(request.data.status).toBe("paid");
  const statement = await serviceSql("select status from public.daily_statements where driver_id=$1", [driver.id]);
  expect(statement.rows[0].status).toBe("paid_out");
});
