import { assertEquals } from "@std/assert";
import { authorizeWebhook } from "./webhook-auth.ts";

Deno.test("webhook : fermé quand le secret est absent ou vide", async () => {
  const req = new Request("http://local", { method: "POST" });
  assertEquals((await authorizeWebhook(req, undefined, "x-trigger"))?.status, 503);
  assertEquals((await authorizeWebhook(req, "", "x-trigger"))?.status, 503);
});

Deno.test("webhook : secret erroné ou manquant refusé", async () => {
  const attempts: HeadersInit[] = [{}, { "x-trigger": "autre" }];
  for (const headers of attempts) {
    assertEquals((await authorizeWebhook(new Request("http://local", { method: "POST", headers }), "secret", "x-trigger"))?.status, 401);
  }
});

Deno.test("webhook : POST avec le secret exact accepté, GET refusé", async () => {
  const headers = { "x-trigger": "secret" };
  assertEquals(await authorizeWebhook(new Request("http://local", { method: "POST", headers }), "secret", "x-trigger"), null);
  assertEquals((await authorizeWebhook(new Request("http://local", { headers }), "secret", "x-trigger"))?.status, 405);
});
