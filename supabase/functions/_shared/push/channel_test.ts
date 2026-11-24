import { assertEquals } from "@std/assert";
import { channelFor } from "./provider.ts";

Deno.test("canal push : le canal dédié exige un appareil qui le déclare", () => {
  assertEquals(channelFor("ride_offer", true), "teko-offers");
  assertEquals(channelFor("ride_offer", false), "teko-alerts");
  assertEquals(channelFor("ride_accepted", true), "teko-alerts");
});
