import { assertEquals } from "@std/assert";
import { cleanPlace } from "./change.ts";
import { joinShapes } from "./route.ts";
import { quoteOptions } from "./trip.ts";

Deno.test("un lieu ne garde que les champs attendus et refuse un point invalide", () => {
  assertEquals(
    cleanPlace({ lon: 9.45, lat: 0.4, hint: "portail bleu", prix: 1 }),
    {
      lon: 9.45,
      lat: 0.4,
      hint: "portail bleu",
    },
  );
  assertEquals(cleanPlace({ lon: 200, lat: 0 }), null);
  assertEquals(cleanPlace({ lon: 9, lat: 0, landmark_id: "x" }), null);
  assertEquals(cleanPlace({ lon: 9, lat: 0, hint: "a".repeat(201) }), null);
});

Deno.test("plusieurs tronçons sont joints sans ambiguïté avec une polyligne seule", () => {
  assertEquals(joinShapes(["abc"]), "abc");
  assertEquals(joinShapes(["abc", "def"]), '["abc","def"]');
});

Deno.test("les options de devis ne transmettent que places et service", () => {
  assertEquals(quoteOptions({ seats: 2, price: 1 }), { seats: 2 });
  assertEquals(quoteOptions({}), {});
});
