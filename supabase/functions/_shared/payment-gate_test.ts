import { assertEquals } from "@std/assert";
import { paymentGate } from "./payment-gate.ts";

Deno.test("alpha : aucun fournisseur réel ni mock public", async () => {
  const saved = Object.fromEntries(["TEKO_PAYMENT_SANDBOX", "PAYMENT_PROVIDER", "TEKO_SANDBOX_SECRET"].map((k) => [k, Deno.env.get(k)]));
  try {
    const req = new Request("http://local", { method: "POST" });
    Deno.env.delete("TEKO_PAYMENT_SANDBOX");
    assertEquals((await paymentGate(req))?.status, 503);
    Deno.env.set("TEKO_PAYMENT_SANDBOX", "true");
    Deno.env.set("PAYMENT_PROVIDER", "airtel");
    assertEquals((await paymentGate(req))?.status, 503);
    Deno.env.set("PAYMENT_PROVIDER", "mock");
    Deno.env.set("TEKO_SANDBOX_SECRET", "test-only");
    assertEquals((await paymentGate(req))?.status, 401);
    assertEquals(await paymentGate(new Request("http://local", {
      method: "POST", headers: { "x-teko-sandbox-secret": "test-only" },
    })), null);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
  }
});
