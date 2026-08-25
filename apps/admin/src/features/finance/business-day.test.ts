import { describe, expect, it } from "vitest";
import { businessDayLabel, businessDayOf, formatDateTime } from "./business-day";

describe("jour métier (04 h 00, Africa/Libreville)", () => {
  it("avant 04 h locale → rattaché à la veille", () => {
    // 02:30 UTC = 03:30 à Libreville (UTC+1) → encore la journée du 24.
    expect(businessDayOf(new Date("2026-08-25T02:30:00Z"))).toBe("2026-08-24");
  });

  it("après 04 h locale → journée courante", () => {
    // 03:30 UTC = 04:30 à Libreville → journée du 25.
    expect(businessDayOf(new Date("2026-08-25T03:30:00Z"))).toBe("2026-08-25");
  });

  it("fin de soirée locale → toujours la journée courante", () => {
    // 23:30 UTC = 00:30 le 26 à Libreville, avant la bascule de 04 h.
    expect(businessDayOf(new Date("2026-08-25T23:30:00Z"))).toBe("2026-08-25");
  });

  it("libellé français du jour", () => {
    const label = businessDayLabel("2026-08-25");
    expect(label).toContain("mardi");
    expect(label).toContain("25");
    expect(label).toContain("août");
  });

  it("date-heure des paiements en heure de Libreville", () => {
    expect(formatDateTime("2026-08-25T13:47:00Z")).toContain("25/08");
    expect(formatDateTime("2026-08-25T13:47:00Z")).toContain("47");
    expect(formatDateTime("n'importe quoi")).toBe("n'importe quoi");
  });
});
