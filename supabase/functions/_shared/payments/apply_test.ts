// Tests de la RÈGLE FINANCE : applyOutcome ne pose jamais de statut final
// directement — confirm_payment / fail_payment font la transition (et postent
// le grand livre). Régression « payé mais toujours suspendu » : écrire
// 'success' avant le RPC armait sa garde d'idempotence, l'écriture settlement
// n'était jamais postée et maybe_reactivate_driver ne tournait pas.
import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { fakeDb } from "../testing/fake_db.ts";
import { applyOutcome } from "./apply.ts";
import type { TxnStatus } from "./provider.ts";

const PMT = { id: "pay-1", provider_txn_id: null };

function run(status: TxnStatus, opts: { rpcError?: { message: string } } = {}) {
  const f = fakeDb({ payments: { ...PMT } }, opts);
  const done = applyOutcome(
    f.client,
    PMT,
    { status, providerTxnId: "MOCK-1", raw: { mock: true } },
    "collect failed",
  );
  return { f, done };
}

Deno.test("succès : trace sans statut, PUIS confirm_payment (jamais l'inverse)", async () => {
  const { f, done } = run("success");
  assertEquals(await done, "confirm");
  assertEquals(f.updates.length, 1);
  // Le point exact de la régression : aucun statut écrit hors RPC.
  assertFalse("status" in f.updates[0].payload);
  assertEquals(f.updates[0].payload.provider_txn_id, "MOCK-1");
  assertEquals(f.rpcs, [{ fn: "confirm_payment", args: { p_payment: "pay-1" } }]);
  assertEquals(f.ops, ["update:payments:provider_txn_id,raw", "rpc:confirm_payment"]);
});

Deno.test("échec : fail_payment fait la transition, pas d'écriture directe", async () => {
  const { f, done } = run("failed");
  assertEquals(await done, "fail");
  assertEquals(f.updates.length, 1);
  assertFalse("status" in f.updates[0].payload);
  assertEquals(f.rpcs, [{ fn: "fail_payment", args: { p_payment: "pay-1", p_reason: "collect failed" } }]);
});

Deno.test("en attente : 'pending' posé sans écraser un 'success' concurrent", async () => {
  const { f, done } = run("pending");
  assertEquals(await done, "retry");
  assertEquals(f.rpcs.length, 0);
  assertEquals(f.updates.length, 2);
  assertEquals(f.updates[1].payload, { status: "pending" });
  assert(f.updates[1].filters.includes("neq:status=success"));
});

Deno.test("ambigu : même traitement que pending (payments-reconcile tranchera)", async () => {
  const { f, done } = run("ambiguous");
  assertEquals(await done, "retry");
  assertEquals(f.rpcs.length, 0);
});

Deno.test("erreur du RPC de confirmation : propagée, jamais de faux succès", async () => {
  const { done } = run("success", { rpcError: { message: "réseau indisponible" } });
  await assertRejects(() => done, Error, "confirm_payment");
});
