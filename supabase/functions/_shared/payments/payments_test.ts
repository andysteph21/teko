// Tests unitaires (Deno) de la logique de paiement, indépendants de la base et d'Airtel.
// Lancer : cd supabase/functions && deno test --allow-env .
// (depuis ce dossier : la carte d'imports de deno.json n'est pas découverte
// depuis la racine pnpm ; --allow-env : les tests fixent PAYMENT_PROVIDER etc.)
import { assertEquals } from "@std/assert";
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
  assertEquals((await p.enquire("settle-fail", "collect")).status, "failed");
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

// --- Callbacks Airtel authentifiés (lot 6) ----------------------------------
import { timingSafeEqual, verifyAirtelCallback } from "./airtel.ts";

const CB_BODY = JSON.stringify({ transaction: { id: "tx-1", status_code: "TS" } });

Deno.test("timingSafeEqual compare sans égalité de longueur requise", async () => {
  assertEquals(await timingSafeEqual("secret", "secret"), true);
  assertEquals(await timingSafeEqual("secret", "Secret"), false);
  assertEquals(await timingSafeEqual("secret", "secret-plus-long"), false);
});

Deno.test("verifyAirtelCallback : fermé par défaut sans jeton configuré", async () => {
  Deno.env.delete("AIRTEL_CALLBACK_TOKEN");
  const r = await verifyAirtelCallback(new Headers({ authorization: "peu-importe" }), CB_BODY);
  assertEquals(r.valid, false);
});

Deno.test("verifyAirtelCallback : jeton exact requis (Bearer toléré)", async () => {
  Deno.env.set("AIRTEL_CALLBACK_TOKEN", "jeton-portail");
  Deno.env.delete("AIRTEL_CALLBACK_HMAC_SECRET");
  const ok = await verifyAirtelCallback(new Headers({ authorization: "Bearer jeton-portail" }), CB_BODY);
  assertEquals(ok.valid, true);
  assertEquals(ok.partnerTxnId, "tx-1");
  assertEquals(ok.status, "success");
  const bad = await verifyAirtelCallback(new Headers({ authorization: "Bearer autre" }), CB_BODY);
  assertEquals(bad.valid, false);
  Deno.env.delete("AIRTEL_CALLBACK_TOKEN");
});

Deno.test("verifyAirtelCallback : HMAC du corps exigée quand le secret est posé", async () => {
  Deno.env.set("AIRTEL_CALLBACK_TOKEN", "jeton-portail");
  Deno.env.set("AIRTEL_CALLBACK_HMAC_SECRET", "hmac-secret");
  const missing = await verifyAirtelCallback(new Headers({ authorization: "jeton-portail" }), CB_BODY);
  assertEquals(missing.valid, false);

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode("hmac-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(CB_BODY)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  const signed = await verifyAirtelCallback(
    new Headers({ authorization: "jeton-portail", "x-signature": hex }), CB_BODY,
  );
  assertEquals(signed.valid, true);
  Deno.env.delete("AIRTEL_CALLBACK_TOKEN");
  Deno.env.delete("AIRTEL_CALLBACK_HMAC_SECRET");
});
