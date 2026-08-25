// Formatage pur C-15/16/17 : heures françaises, n° de reçu, montants
// (numeric → string via supabase-js), noms courts, téléphone, références.

import {
  categorieLabel,
  dureeMin,
  heureFr,
  initialesDe,
  jourFr,
  kmFr,
  montantCourse,
  nomCourt,
  numeroRecu,
  refCourte,
  telephoneAffiche,
} from "./format";

const iso = (ymdhm: [number, number, number, number, number]) => new Date(...ymdhm).toISOString();

describe("heureFr / jourFr", () => {
  it("affiche « 14 h 46 » et « 14 h 05 »", () => {
    expect(heureFr(iso([2026, 7, 26, 14, 46]))).toBe("14 h 46");
    expect(heureFr(iso([2026, 7, 26, 14, 5]))).toBe("14 h 05");
  });

  it("jourFr : null aujourd'hui, sinon « 26 août » (+ année si autre)", () => {
    const maintenant = new Date(2026, 7, 26, 18, 0);
    expect(jourFr(iso([2026, 7, 26, 14, 46]), maintenant)).toBeNull();
    expect(jourFr(iso([2026, 7, 25, 14, 46]), maintenant)).toBe("25 août");
    expect(jourFr(iso([2025, 11, 31, 9, 0]), maintenant)).toBe("31 décembre 2025");
  });
});

describe("numeroRecu", () => {
  it("compose TK-jjmm + 4 premiers hex de l'id", () => {
    expect(
      numeroRecu({
        id: "0147ab00-0000-0000-0000-000000000000",
        completed_at: iso([2026, 7, 26, 14, 46]),
        created_at: iso([2026, 7, 26, 14, 20]),
      }),
    ).toBe("TK-2608-0147");
  });
});

describe("montants et mesures", () => {
  it("montantCourse : final prioritaire, coercition des chaînes", () => {
    expect(montantCourse({ price_final: "1500" as never, price_est: 1200 })).toBe(1500);
    expect(montantCourse({ price_final: null, price_est: "1200" as never })).toBe(1200);
    expect(montantCourse({ price_final: null, price_est: null })).toBe(0);
  });

  it("dureeMin : réel started→completed, sinon estimé, plancher 1", () => {
    expect(
      dureeMin({
        started_at: iso([2026, 7, 26, 14, 29]),
        completed_at: iso([2026, 7, 26, 14, 46]),
        duration_est_s: 600,
      }),
    ).toBe(17);
    expect(dureeMin({ started_at: null, completed_at: null, duration_est_s: 840 })).toBe(14);
    expect(dureeMin({ started_at: null, completed_at: null, duration_est_s: 10 })).toBe(1);
  });

  it("kmFr : virgule française à une décimale", () => {
    expect(kmFr(5200)).toBe("5,2");
    expect(kmFr(980)).toBe("1");
  });
});

describe("identités et références", () => {
  it("nomCourt et initialesDe", () => {
    expect(nomCourt("Boris Mba")).toBe("Boris M.");
    expect(nomCourt("Boris")).toBe("Boris");
    expect(initialesDe("Boris M.")).toBe("BM");
    expect(initialesDe("Votre chauffeur")).toBe("VC");
  });

  it("telephoneAffiche groupe par paires après +241", () => {
    expect(telephoneAffiche("+24106123456")).toBe("+241 06 12 34 56");
    expect(telephoneAffiche("0612")).toBe("0612");
  });

  it("refCourte tronque les longues références", () => {
    expect(refCourte("MP26082026T144600004471")).toBe("MP2608…4471");
    expect(refCourte("MP123")).toBe("MP123");
  });

  it("categorieLabel accentue les catégories", () => {
    expect(categorieLabel("eco")).toBe("Éco");
    expect(categorieLabel("confort")).toBe("Confort");
  });
});
