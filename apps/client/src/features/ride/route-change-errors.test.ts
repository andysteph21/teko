import { TekoApiError, type TekoApiErrorCode } from "@teko/api-client";
import { routeChangeErrorKey } from "./route-change-errors";
import { rideFr } from "./strings";

const CODES: TekoApiErrorCode[] = [
  "service_closed",
  "route_too_many_stops",
  "route_too_many_changes",
  "route_not_editable",
  "route_change_handled",
  "seats_full",
  "fees_due",
];

describe("erreurs de modification de trajet (R3)", () => {
  it.each(CODES)("%s a son message français", (code) => {
    const key = routeChangeErrorKey(new TekoApiError(code, "message serveur"));
    expect(key).toBe(`ride:modification.erreurs.${code}`);
    expect(rideFr.modification.erreurs[code as keyof typeof rideFr.modification.erreurs]).toEqual(
      expect.any(String),
    );
  });

  it("réseau et inconnu retombent sur les messages communs, jamais sur le texte serveur", () => {
    expect(routeChangeErrorKey(new TekoApiError("network", "fetch failed"))).toBe("erreurs.reseau");
    expect(routeChangeErrorKey(new Error("Trajet non modifiable"))).toBe("erreurs.generique");
  });
});
