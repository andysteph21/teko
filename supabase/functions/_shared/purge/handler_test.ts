// Tests Deno purs du handler de purge auth (pas de base, pas de GoTrue).

import { assertEquals } from "@std/assert";
import { purgeAuthAccounts } from "./handler.ts";

Deno.test("aucun compte en attente → rien à faire", async () => {
  const r = await purgeAuthAccounts({
    listPending: () => Promise.resolve([]),
    deactivate: () => Promise.reject(new Error("ne doit pas être appelé")),
  });
  assertEquals(r, { pending: 0, deactivated: 0, failed: [] });
});

Deno.test("chaque compte en attente est désactivé une fois", async () => {
  const seen: string[] = [];
  const r = await purgeAuthAccounts({
    listPending: () => Promise.resolve(["u1", "u2"]),
    deactivate: (id) => {
      seen.push(id);
      return Promise.resolve(null);
    },
  });
  assertEquals(seen, ["u1", "u2"]);
  assertEquals(r, { pending: 2, deactivated: 2, failed: [] });
});

Deno.test("un échec n'arrête pas les autres et est remonté", async () => {
  const r = await purgeAuthAccounts({
    listPending: () => Promise.resolve(["ok", "erreur", "exception"]),
    deactivate: (id) => {
      if (id === "erreur") return Promise.resolve("GoTrue indisponible");
      if (id === "exception") return Promise.reject(new Error("réseau"));
      return Promise.resolve(null);
    },
  });
  assertEquals(r.pending, 3);
  assertEquals(r.deactivated, 1);
  assertEquals(r.failed, [
    { id: "erreur", reason: "GoTrue indisponible" },
    { id: "exception", reason: "Error: réseau" },
  ]);
});
