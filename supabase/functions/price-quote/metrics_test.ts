import { assertEquals } from "@std/assert";
import { quoteMetrics } from "./metrics.ts";

Deno.test("le trajet nul ou arrondi à zéro est refusé avant Postgres", () => {
  assertEquals(quoteMetrics({ length: 0, time: 0 }), {
    error: "POINTS_TOO_CLOSE",
  });
  assertEquals(quoteMetrics({ length: 0.0004, time: 1 }), {
    error: "POINTS_TOO_CLOSE",
  });
});

Deno.test("un court trajet réel conserve sa distance et une durée exploitable", () => {
  assertEquals(quoteMetrics({ length: 0.006, time: 0.2 }), {
    distanceM: 6,
    durationS: 1,
  });
  assertEquals(quoteMetrics({ length: 1, time: 0 }), {
    error: "ROUTING_UNAVAILABLE",
  });
  assertEquals(quoteMetrics(undefined), { error: "ROUTING_UNAVAILABLE" });
});
