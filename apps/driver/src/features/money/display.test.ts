// Helpers purs du parcours I — états du solde (dont l'urgence < 4 h avant
// la clôture de 04 h 00 Libreville), compte à rebours, dates françaises,
// résumé de semaine et saisie de montant.

import {
  balanceState,
  formatCountdown,
  jourLong,
  jourTitre,
  parseMontant,
  resumeSemaine,
  type StatementRow,
  statementNet,
  telephoneAffiche,
} from "./display";

// 02:30 à Libreville (UTC+1) : clôture de 04 h 00 dans 1 h 30 → urgence.
const PRES_CLOTURE = new Date("2026-08-18T01:30:00Z");
// 11:00 à Libreville : prochaine clôture le lendemain → échéance lointaine.
const LOIN_CLOTURE = new Date("2026-08-18T10:00:00Z");

describe("balanceState", () => {
  it("distingue les quatre états du doc parcours I", () => {
    expect(balanceState(1870, true, LOIN_CLOTURE)).toBe("crediteur");
    expect(balanceState(-3000, true, LOIN_CLOTURE)).toBe("debiteur");
    expect(balanceState(-3000, true, PRES_CLOTURE)).toBe("urgence");
    expect(balanceState(-3000, false, PRES_CLOTURE)).toBe("suspendu");
  });

  it("créditeur n'est jamais urgent, même juste avant la clôture", () => {
    expect(balanceState(500, true, PRES_CLOTURE)).toBe("crediteur");
  });
});

describe("formatCountdown", () => {
  it("« 1 h 30 » au-delà d'une heure, « mm:ss » en dessous", () => {
    expect(formatCountdown(90 * 60_000)).toBe("1 h 30");
    expect(formatCountdown(9 * 60_000 + 5_000)).toBe("09:05");
    expect(formatCountdown(-1)).toBe("00:00");
  });
});

describe("dates françaises", () => {
  it("jourLong et jourTitre suivent la convention des maquettes", () => {
    expect(jourLong("2026-08-18")).toBe("mardi 18 août");
    expect(jourTitre("2026-08-18", "2026-08-18")).toBe("Aujourd'hui · mar. 18 août");
    expect(jourTitre("2026-08-16", "2026-08-18")).toBe("Dimanche 16 août");
  });
});

describe("parseMontant", () => {
  it("entier strictement positif, sinon null", () => {
    expect(parseMontant("3000")).toBe(3000);
    expect(parseMontant("3 000")).toBe(3000);
    expect(parseMontant("0")).toBeNull();
    expect(parseMontant("")).toBeNull();
    expect(parseMontant("abc")).toBeNull();
  });
});

describe("telephoneAffiche", () => {
  it("groupe par paires après +241", () => {
    expect(telephoneAffiche("+24107894512")).toBe("+241 07 89 45 12");
  });
});

const releve = (surcharges: Partial<StatementRow>): StatementRow =>
  ({
    id: "st-1",
    driver_id: "d-1",
    business_day: "2026-08-18",
    opening: 0,
    closing: 0,
    total_commission: 0,
    total_mobile_credit: 0,
    payout_amount: null,
    settled_amount: null,
    status: "open",
    created_at: "2026-08-18T03:00:05Z",
    updated_at: "2026-08-18T03:00:05Z",
    ...surcharges,
  }) as StatementRow;

describe("relevés (numériques en chaînes via supabase-js)", () => {
  it("statementNet = crédits Airtel − |commission|", () => {
    const st = releve({
      total_commission: "-1980" as unknown as number,
      total_mobile_credit: "1870" as unknown as number,
    });
    expect(statementNet(st)).toBe(-110);
  });

  it("resumeSemaine somme les 7 derniers jours métier seulement", () => {
    const sts = [
      releve({ business_day: "2026-08-18", total_mobile_credit: 5000, total_commission: -1000 }),
      releve({ id: "st-2", business_day: "2026-08-12", total_mobile_credit: 2000 }),
      // Hors fenêtre (8 jours avant) : ignoré.
      releve({ id: "st-3", business_day: "2026-08-10", total_mobile_credit: 9999 }),
    ];
    expect(resumeSemaine(sts, "2026-08-18")).toEqual({
      net: 6000,
      journees: 2,
      commission: 1000,
    });
  });
});
