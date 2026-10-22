// Tests Deno purs du module push (pas de DB) — libellés par type et mock.

import { assertEquals } from "@std/assert";
import { messageForType, mockProvider } from "./index.ts";

Deno.test("messageForType : l'offre chauffeur est urgente et éphémère", () => {
  const m = messageForType("ride_offer", {});
  assertEquals(m.title, "Nouvelle course à proximité");
  assertEquals(m.ttl, "12s");
});

Deno.test("messageForType : aucun montant sur l’écran verrouillé", () => {
  const m = messageForType("settlement_reminder", { amount: 3000 });
  assertEquals(m.body.includes("3000"), false);
});

Deno.test("messageForType : type inconnu → libellé générique", () => {
  const m = messageForType("type_mystere", {});
  assertEquals(m.title, "Teko");
});

Deno.test("mockProvider répond ok sans réseau", async () => {
  const result = await mockProvider().send({
    token: "jeton-test-123456",
    title: "t",
    body: "b",
    data: {},
  });
  assertEquals(result.ok, true);
});
