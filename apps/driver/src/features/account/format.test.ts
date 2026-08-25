// Helpers purs du profil D-18 : masquage du numéro de versement, initiales,
// ancienneté, dernière pièce par type.

import type { TableRow } from "@teko/types";
import { initials, latestDocuments, maskMsisdn, memberSince } from "./format";

describe("maskMsisdn (D-18)", () => {
  it("ne laisse lisibles que les 4 derniers chiffres", () => {
    expect(maskMsisdn("+24107894512")).toBe("+241 •• •• 45 12");
    expect(maskMsisdn("07 89 45 12")).toBe("+241 •• •• 45 12");
  });

  it("— si aucun numéro exploitable", () => {
    expect(maskMsisdn(null)).toBe("—");
    expect(maskMsisdn("12")).toBe("—");
  });
});

describe("initials", () => {
  it("deux premiers mots du nom complet", () => {
    expect(initials("Boris Mba")).toBe("BM");
    expect(initials("boris")).toBe("B");
    expect(initials("")).toBe("•");
  });
});

describe("memberSince", () => {
  it("« juin 2026 » depuis un timestamp ISO", () => {
    expect(memberSince("2026-06-15T10:00:00Z")).toBe("juin 2026");
  });
});

describe("latestDocuments (remplacement D-08b)", () => {
  it("garde la pièce la plus récente de chaque type (entrée triée desc)", () => {
    const doc = (id: string, type: string) => ({ id, type }) as TableRow<"driver_documents">;
    const latest = latestDocuments([
      doc("d3", "license"),
      doc("d2", "insurance"),
      doc("d1", "license"),
    ]);
    expect(latest.map((d) => d.id)).toEqual(["d3", "d2"]);
  });
});
