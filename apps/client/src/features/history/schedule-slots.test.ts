// Créneaux C-18 : bornes, pas de 15 min, délai minimal de 30 min.

import { dayOptions, sameDay, timeSlots } from "./schedule-slots";

describe("dayOptions", () => {
  it("7 jours à partir d'aujourd'hui (minuit local)", () => {
    const now = new Date(2026, 7, 25, 14, 3);
    const days = dayOptions(now);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual(new Date(2026, 7, 25));
    expect(days[6]).toEqual(new Date(2026, 7, 31));
  });
});

describe("timeSlots", () => {
  it("aujourd'hui : démarre à maintenant + 30 min arrondi au quart d'heure", () => {
    const now = new Date(2026, 7, 25, 14, 3);
    const slots = timeSlots(new Date(2026, 7, 25), now);
    const first = slots[0] as Date;
    expect(first.getTime()).toBeGreaterThanOrEqual(now.getTime() + 30 * 60_000);
    expect(first.getMinutes() % 15).toBe(0);
    expect((slots[1] as Date).getTime() - first.getTime()).toBe(15 * 60_000);
  });

  it("jour futur : de 05 h 00 à 22 h 00", () => {
    const now = new Date(2026, 7, 25, 14, 3);
    const day = new Date(2026, 7, 26);
    const slots = timeSlots(day, now);
    expect(slots[0]).toEqual(new Date(2026, 7, 26, 5, 0));
    expect(slots[slots.length - 1]).toEqual(new Date(2026, 7, 26, 22, 0));
    expect(sameDay(slots[0] as Date, day)).toBe(true);
  });

  it("fin de journée : plus aucun créneau", () => {
    const now = new Date(2026, 7, 25, 21, 45);
    expect(timeSlots(new Date(2026, 7, 25), now)).toHaveLength(0);
  });
});
