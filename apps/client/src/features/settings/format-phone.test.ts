// Formatage lisible des numéros gabonais (en-tête C-23, carte numéro C-24).

import { formatGabonPhone } from "./format-phone";

describe("formatGabonPhone", () => {
  it("groupe un E.164 gabonais par paires", () => {
    expect(formatGabonPhone("+24106123456")).toBe("+241 06 12 34 56");
  });

  it("tolère les numéros de test à 9 chiffres", () => {
    expect(formatGabonPhone("+241070000001")).toBe("+241 07 00 00 001");
  });

  it("rend tel quel un format inattendu, vide si absent", () => {
    expect(formatGabonPhone("+33612345678")).toBe("+33612345678");
    expect(formatGabonPhone(null)).toBe("");
    expect(formatGabonPhone(undefined)).toBe("");
  });
});
