// Handler payout sous provider mock, sans base (client injecté).
// Même règle finance qu'airtel-collect : sans le RPC confirm_payment,
// l'écriture 'payout' (négative) ne serait jamais postée et le solde
// du chauffeur ne serait jamais débité du versement.
import { assertEquals, assertFalse } from "@std/assert";
import { fakeDb } from "../_shared/testing/fake_db.ts";
import { handleDisburse } from "./handler.ts";

const PAYOUT = {
  id: "pay-9",
  kind: "payout",
  status: "initiated",
  amount: "12000",
  partner_txn_id: "payout-xyz-9",
  provider_txn_id: null,
  driver_id: "drv-1",
  ride_id: null,
};

const DRIVER = { payout_msisdn: "074000001" };

function req(body: unknown): Request {
  return new Request("http://local/airtel-disburse", { method: "POST", body: JSON.stringify(body) });
}

Deno.test("mock succès : confirm_payment appelé, aucun statut écrit directement", async () => {
  Deno.env.set("PAYMENT_PROVIDER", "mock");
  const f = fakeDb({ payments: PAYOUT, drivers: DRIVER });
  const res = await handleDisburse(req({ payment_id: "pay-9" }), f.client);
  assertEquals(await res.json(), { status: "success" });
  assertEquals(f.rpcs, [{ fn: "confirm_payment", args: { p_payment: "pay-9" } }]);
  for (const u of f.updates) {
    assertFalse("status" in u.payload, "statut final réservé aux RPC confirm/fail_payment");
  }
});

Deno.test("kind non payout : 400, rien n'est tenté", async () => {
  const f = fakeDb({ payments: { ...PAYOUT, kind: "driver_settlement" } });
  const res = await handleDisburse(req({ payment_id: "pay-9" }), f.client);
  assertEquals(res.status, 400);
  assertEquals(f.updates.length, 0);
  assertEquals(f.rpcs.length, 0);
});

Deno.test("paiement déjà 'success' : idempotent", async () => {
  const f = fakeDb({ payments: { ...PAYOUT, status: "success" } });
  const res = await handleDisburse(req({ payment_id: "pay-9" }), f.client);
  assertEquals(await res.json(), { status: "success" });
  assertEquals(f.rpcs.length, 0);
});
