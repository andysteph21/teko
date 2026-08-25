// Formats purs du parcours repères : distance, date de proposition,
// surlignage de requête, puces-préfixes d'indication.

import {
  activeHintPrefix,
  applyHintPrefix,
  formatDistanceText,
  formatProposalDate,
  splitOnQuery,
} from "./format";

describe("formatDistanceText", () => {
  it("mètres arrondis à la dizaine, kilomètres avec virgule", () => {
    expect(formatDistanceText(347)).toBe("350 m");
    expect(formatDistanceText(3)).toBe("10 m");
    expect(formatDistanceText(1234)).toBe("1,2 km");
    expect(formatDistanceText(-5)).toBe("");
  });
});

describe("formatProposalDate", () => {
  const now = new Date("2026-08-25T12:00:00Z");

  it("aujourd'hui / hier / date longue", () => {
    expect(formatProposalDate("2026-08-25T09:00:00Z", now)).toBe("aujourd'hui");
    expect(formatProposalDate("2026-08-24T09:00:00Z", now)).toBe("hier");
    expect(formatProposalDate("2026-08-15T09:00:00Z", now)).toBe("le 15 août");
  });
});

describe("splitOnQuery", () => {
  it("découpe insensible à la casse, sans correspondance → tout avant", () => {
    expect(splitOnQuery("Pharmacie du Gros-Bouquet", "phar")).toEqual({
      before: "",
      match: "Phar",
      after: "macie du Gros-Bouquet",
    });
    expect(splitOnQuery("Marché de Nkembo", "église")).toEqual({
      before: "Marché de Nkembo",
      match: "",
      after: "",
    });
  });
});

describe("puces-préfixes d'indication (C-09)", () => {
  const prefixes = ["Derrière", "En face de", "À côté de"];

  it("préfixe un texte vide et remplace un préfixe existant", () => {
    expect(applyHintPrefix("", "Derrière", prefixes)).toBe("Derrière ");
    expect(applyHintPrefix("Derrière le portail bleu", "En face de", prefixes)).toBe(
      "En face de le portail bleu",
    );
  });

  it("détecte la puce active", () => {
    expect(activeHintPrefix("En face de la pharmacie", prefixes)).toBe("En face de");
    expect(activeHintPrefix("portail bleu", prefixes)).toBeNull();
  });
});
