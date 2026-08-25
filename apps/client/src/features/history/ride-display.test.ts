// Helpers purs C-19/C-20 : puces d'état, filtres, montants, dates fr.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import {
  dayLabel,
  describeWhen,
  formatKm,
  formatTimeFr,
  groupRides,
  isUpcoming,
  matchesFilter,
  rideAmountText,
  rideChip,
  rideTitle,
} from "./ride-display";

const t = (key: string) => key;

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
    distance_est_m: null,
    ...over,
  } as RideRow;
}

const NOW = new Date(2026, 7, 25, 12, 0); // mardi 25 août 2026

describe("rideChip", () => {
  it("mappe chaque famille de statut sur sa puce", () => {
    expect(rideChip(ride({ status: "completed" }), NOW).tone).toBe("ok");
    expect(rideChip(ride({ status: "cancelled_driver" }), NOW).tone).toBe("cancel");
    expect(rideChip(ride({ status: "no_show" }), NOW).tone).toBe("cancel");
    expect(rideChip(ride({ status: "enroute" }), NOW).tone).toBe("pending");
    const planned = ride({
      status: "requested",
      scheduled_at: new Date(2026, 7, 26).toISOString(),
    });
    expect(rideChip(planned, NOW)).toEqual({
      tone: "scheduled",
      labelKey: "history:liste.statutPlanifiee",
    });
  });
});

describe("filtres", () => {
  it("« à venir » = planifiée future et non attribuée", () => {
    const planned = ride({
      status: "requested",
      scheduled_at: new Date(2026, 7, 26).toISOString(),
    });
    const past = ride({ status: "requested", scheduled_at: new Date(2026, 7, 24).toISOString() });
    expect(isUpcoming(planned, NOW)).toBe(true);
    expect(isUpcoming(past, NOW)).toBe(false);
    expect(matchesFilter(planned, "aVenir", NOW)).toBe(true);
    expect(matchesFilter(ride({ status: "no_answer" }), "annulees", NOW)).toBe(true);
    expect(matchesFilter(ride({ status: "completed" }), "annulees", NOW)).toBe(false);
  });
});

describe("montants", () => {
  it("final sinon ≈ estimation ; annulée sans final = 0 (numériques en chaînes)", () => {
    expect(rideAmountText(ride({ price_final: "1500" as never }))).toBe(formatXaf(1500, "FCFA"));
    expect(rideAmountText(ride({ status: "requested", price_est: "2500" as never }))).toBe(
      `≈${formatXaf(2500, "FCFA")}`,
    );
    expect(rideAmountText(ride({ status: "cancelled_client" }))).toBe(formatXaf(0, "FCFA"));
  });
});

describe("dates françaises", () => {
  it("Aujourd'hui / Hier / date longue, heures « 08 h 05 »", () => {
    expect(dayLabel(new Date(2026, 7, 25, 23), NOW)).toEqual({ kind: "today" });
    expect(dayLabel(new Date(2026, 7, 24, 1), NOW)).toEqual({ kind: "yesterday" });
    expect(dayLabel(new Date(2026, 7, 26, 1), NOW)).toEqual({ kind: "tomorrow" });
    expect(dayLabel(new Date(2026, 7, 10), NOW)).toEqual({ kind: "date", label: "Lundi 10 août" });
    expect(formatTimeFr(new Date(2026, 7, 25, 8, 5))).toBe("08 h 05");
    expect(formatKm(5200)).toBe("5,2 km");
  });
});

describe("groupRides", () => {
  it("place les planifiées en tête puis groupe par jour de demande", () => {
    const upcoming = ride({
      id: "up",
      status: "requested",
      scheduled_at: new Date(2026, 7, 26, 8).toISOString(),
      created_at: new Date(2026, 7, 25, 7).toISOString(),
    });
    const today = ride({ id: "td", created_at: new Date(2026, 7, 25, 9).toISOString() });
    const yesterday = ride({ id: "yd", created_at: new Date(2026, 7, 24, 18).toISOString() });
    const sections = groupRides([today, upcoming, yesterday], NOW);
    expect(sections.map((s) => s.key)).toEqual(["upcoming", "today", "yesterday"]);
    expect(sections[0]?.rides[0]?.id).toBe("up");
  });
});

describe("titres et détail", () => {
  it("titre départ → arrivée seulement si les deux indications existent", () => {
    expect(rideTitle(ride({ origin_hint: "Gare", dest_hint: "Nkembo" }))).toBe("Gare → Nkembo");
    expect(rideTitle(ride({ origin_hint: "Gare" }))).toBeNull();
  });

  it("describeWhen assemble jour · heures · distance", () => {
    const r = ride({
      started_at: new Date(2026, 7, 25, 14, 29).toISOString(),
      completed_at: new Date(2026, 7, 25, 14, 46).toISOString(),
      distance_est_m: 5200,
    });
    expect(describeWhen(r, NOW, t)).toBe("history:jours.aujourdhui · 14 h 29 → 14 h 46 · 5,2 km");
  });
});
