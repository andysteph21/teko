// Helpers purs de l'historique D-20 : groupement par jour avec total brut,
// montants (brut / 0 annulée / ≈ estimation), filtres.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import {
  dayLabel,
  groupRidesByDay,
  matchesFilter,
  rideAmount,
  rideHint,
  sectionTotalText,
} from "./ride-display";
import { accountFr } from "./strings";

function ride(over: Partial<RideRow>): RideRow {
  return {
    id: "r1",
    status: "completed",
    category: "eco",
    created_at: new Date().toISOString(),
    scheduled_at: null,
    started_at: null,
    completed_at: null,
    origin_hint: null,
    dest_hint: null,
    price_est: null,
    price_final: null,
    payment_method: null,
    ...over,
  } as RideRow;
}

const t = (key: string, options?: Record<string, unknown>) => {
  if (key === "account:categorie.eco") return accountFr.categorie.eco;
  if (key === "account:historique.paiementEspeces") return accountFr.historique.paiementEspeces;
  return `${key}${options ? JSON.stringify(options) : ""}`;
};

describe("rideAmount (D-20 — brut, jamais le net)", () => {
  it("terminée : +brut et sous-ligne commission", () => {
    // Numériques Postgres en chaînes via supabase-js.
    const a = rideAmount(ride({ price_final: "1200" as never }));
    expect(a.text).toBe(`+${formatXaf(1200, "F")}`);
    expect(a.showCommission).toBe(true);
  });

  it("annulée : 0, en cours : ≈ estimation", () => {
    expect(rideAmount(ride({ status: "cancelled_client" })).text).toBe(formatXaf(0, "F"));
    const enCours = rideAmount(ride({ status: "enroute", price_est: "2200" as never }));
    expect(enCours.text).toBe(`≈${formatXaf(2200, "F")}`);
    expect(enCours.showCommission).toBe(false);
  });
});

describe("groupRidesByDay", () => {
  it("groupe par jour et cumule le brut des courses terminées", () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    const sections = groupRidesByDay(
      [
        ride({ id: "a", price_final: "1200" as never }),
        ride({ id: "b", status: "cancelled_client" }),
        ride({ id: "c", created_at: yesterday.toISOString(), price_final: "2200" as never }),
      ],
      now,
    );
    expect(sections.map((s) => s.key)).toEqual(["today", "yesterday"]);
    expect(sections[0]?.rides).toHaveLength(2);
    expect(sectionTotalText(sections[0] as never)).toBe(`+${formatXaf(1200, "F")}`);
    expect(sections[1]?.totalXaf).toBe(2200);
  });
});

describe("filtres et libellés", () => {
  it("matchesFilter sépare terminées et annulées", () => {
    expect(matchesFilter(ride({}), "terminees")).toBe(true);
    expect(matchesFilter(ride({ status: "no_show" }), "annulees")).toBe(true);
    expect(matchesFilter(ride({ status: "enroute" }), "terminees")).toBe(false);
  });

  it("dayLabel : date française complète au-delà d'hier", () => {
    const now = new Date(2026, 7, 25);
    expect(dayLabel(new Date(2026, 7, 25), now)).toEqual({ kind: "today" });
    expect(dayLabel(new Date(2026, 7, 24), now)).toEqual({ kind: "yesterday" });
    expect(dayLabel(new Date(2026, 7, 16), now)).toEqual({
      kind: "date",
      label: "Dimanche 16 août",
    });
  });

  it("rideHint : heure · catégorie · paiement", () => {
    const hint = rideHint(ride({ completed_at: "2026-08-25T14:46:00", payment_method: "cash" }), t);
    expect(hint).toBe("14 h 46 · Éco · Espèces");
  });
});
