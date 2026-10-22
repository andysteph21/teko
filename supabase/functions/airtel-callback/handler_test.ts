import { assertEquals } from "@std/assert";
import { MockProvider } from "../_shared/payments/mock.ts";
import { fakeDb } from "../_shared/testing/fake_db.ts";
import { handleCallback } from "./handler.ts";

const request = () => new Request("http://local", {
  method: "POST", body: JSON.stringify({ partnerTxnId: "t1", status: "success" }),
});

Deno.test("callback : erreur de confirmation propagée, aucun faux succès", async () => {
  const db = fakeDb({ payments: { id: "p1", status: "pending" } }, { rpcError: { message: "indisponible" } });
  const response = await handleCallback(request(), db.client, new MockProvider());
  assertEquals(response.status, 500);
  assertEquals(db.rpcs.length, 1);
});

Deno.test("callback : confirmation acceptée une fois, rejeu sans appel RPC", async () => {
  const pending = fakeDb({ payments: { id: "p1", status: "pending" } });
  assertEquals((await handleCallback(request(), pending.client, new MockProvider())).status, 200);
  assertEquals(pending.rpcs, [{ fn: "confirm_payment", args: { p_payment: "p1" } }]);
  const settled = fakeDb({ payments: { id: "p1", status: "success" } });
  assertEquals((await handleCallback(request(), settled.client, new MockProvider())).status, 200);
  assertEquals(settled.rpcs.length, 0);
});
