// Tests unitaires (Deno) de la logique de paiement, indépendants de la base et d'Airtel.
// Lancer : deno test supabase/functions/
import { assertEquals } from "jsr:@std/assert@1";
import { resolveOutcome } from "./provider.ts";
import { MockProvider } from "./mock.ts";

Deno.test("resolveOutcome mappe les statuts", () => {
  assertEquals(resolveOutcome("success"), "confirm");
  assertEquals(resolveOutcome("failed"), "fail");
  assertEquals(resolveOutcome("pending"), "retry");
  assertEquals(resolveOutcome("ambiguous"), "retry");
});

Deno.test("MockProvider.collect : statut déterminé par le partnerTxnId", async () => {
  const p = new MockProvider();
  const base = { msisdn: "077000000", amount: 1000, reference: "ride" };
  assertEquals((await p.collect({ ...base, partnerTxnId: "ride-ok" })).status, "success");
  assertEquals((await p.collect({ ...base, partnerTxnId: "ride-fail" })).status, "failed");
  assertEquals((await p.collect({ ...base, partnerTxnId: "ride-pending" })).status, "pending");
  assertEquals((await p.collect({ ...base, partnerTxnId: "ride-ambig" })).status, "ambiguous");
});

Deno.test("MockProvider.disburse et enquire sont cohérents", async () => {
  const p = new MockProvider();
  assertEquals((await p.disburse({ msisdn: "1", amount: 1, reference: "payout", partnerTxnId: "payout-ok" })).status, "success");
  assertEquals((await p.enquire("settle-fail")).status, "failed");
});

Deno.test("MockProvider.verifyCallback parse le corps", async () => {
  const p = new MockProvider();
  const ok = await p.verifyCallback(new Headers(), JSON.stringify({ partnerTxnId: "abc", status: "success" }));
  assertEquals(ok.valid, true);
  assertEquals(ok.partnerTxnId, "abc");
  assertEquals(ok.status, "success");
  const bad = await p.verifyCallback(new Headers(), "not-json");
  assertEquals(bad.valid, false);
});
