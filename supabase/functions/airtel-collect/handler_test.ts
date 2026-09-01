// Handler complet sous provider mock, sans base (client injecté).
// Couvre le chemin de la régression « payé mais toujours suspendu » :
// mock succès → confirm_payment appelé SANS pré-positionnement du statut
// (le ledger et la réactivation, côté SQL, sont couverts par
// supabase/tests/e2e/finance-collect-edge.test.ts).
import { assertEquals, assertFalse } from "@std/assert";
import { fakeDb } from "../_shared/testing/fake_db.ts";
import { handleCollect } from "./handler.ts";

// Miroir d'une ligne payments telle que servie par PostgREST (numériques en strings).
const PAYMENT = {
  id: "pay-1",
  kind: "driver_settlement",
  status: "initiated",
  amount: "500",
  partner_txn_id: "settle-abc-123",
  provider_txn_id: null,
  driver_id: "drv-1",
  ride_id: null,
};

const DRIVER = { payout_msisdn: "074000001" };

function req(body: unknown): Request {
  return new Request("http://local/airtel-collect", { method: "POST", body: JSON.stringify(body) });
}

Deno.test("mock succès : confirm_payment appelé, aucun statut écrit directement", async () => {
  Deno.env.set("PAYMENT_PROVIDER", "mock");
  const f = fakeDb({ payments: PAYMENT, drivers: DRIVER });
  const res = await handleCollect(req({ payment_id: "pay-1" }), f.client);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { status: "success" });
  assertEquals(f.rpcs, [{ fn: "confirm_payment", args: { p_payment: "pay-1" } }]);
  for (const u of f.updates) {
    assertFalse("status" in u.payload, "statut final réservé aux RPC confirm/fail_payment");
  }
  assertEquals(f.updates[0].payload.provider_txn_id, "MOCK-settle-abc-123");
});

Deno.test("paiement déjà 'success' : idempotent, ni provider ni RPC", async () => {
  const f = fakeDb({ payments: { ...PAYMENT, status: "success" } });
  const res = await handleCollect(req({ payment_id: "pay-1" }), f.client);
  assertEquals(await res.json(), { status: "success" });
  assertEquals(f.updates.length, 0);
  assertEquals(f.rpcs.length, 0);
});

Deno.test("mock échec : fail_payment prend la transition", async () => {
  Deno.env.set("PAYMENT_PROVIDER", "mock");
  const f = fakeDb({
    payments: { ...PAYMENT, partner_txn_id: "settle-fail-1" },
    drivers: DRIVER,
  });
  const res = await handleCollect(req({ payment_id: "pay-1" }), f.client);
  assertEquals(await res.json(), { status: "failed" });
  assertEquals(f.rpcs, [{ fn: "fail_payment", args: { p_payment: "pay-1", p_reason: "collect failed" } }]);
  assertFalse("status" in f.updates[0].payload);
});

Deno.test("mock en attente : payment marqué 'pending', reconcile tranchera", async () => {
  Deno.env.set("PAYMENT_PROVIDER", "mock");
  const f = fakeDb({
    payments: { ...PAYMENT, partner_txn_id: "settle-pending-1" },
    drivers: DRIVER,
  });
  const res = await handleCollect(req({ payment_id: "pay-1" }), f.client);
  assertEquals(await res.json(), { status: "pending" });
  assertEquals(f.rpcs.length, 0);
  assertEquals(f.updates[1].payload, { status: "pending" });
});

Deno.test("échec du RPC de confirmation : 500 (pas de succès silencieux)", async () => {
  Deno.env.set("PAYMENT_PROVIDER", "mock");
  const f = fakeDb({ payments: PAYMENT, drivers: DRIVER }, { rpcError: { message: "réseau" } });
  const res = await handleCollect(req({ payment_id: "pay-1" }), f.client);
  assertEquals(res.status, 500);
});

Deno.test("payment_id manquant : 400", async () => {
  const f = fakeDb({});
  const res = await handleCollect(req({}), f.client);
  assertEquals(res.status, 400);
});
