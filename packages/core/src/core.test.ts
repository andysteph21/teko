import { describe, expect, it } from "vitest";
import { businessDay, isBalanceUrgent, msUntilCutoff, nextCutoff } from "./business-day.js";
import { cancellationFee } from "./cancellation.js";
import { formatXaf } from "./money.js";
import { isValidPinFormat, PIN_LENGTH } from "./pin.js";

const NBSP = " ";
const MINUS = "−";

describe("formatXaf", () => {
  it("groupe les milliers avec une espace insécable et l'unité F", () => {
    expect(formatXaf(1200)).toBe(`1${NBSP}200${NBSP}F`);
    expect(formatXaf(1500000)).toBe(`1${NBSP}500${NBSP}000${NBSP}F`);
    expect(formatXaf(950)).toBe(`950${NBSP}F`);
    expect(formatXaf(0)).toBe(`0${NBSP}F`);
  });

  it("affiche les débits avec le vrai signe moins (D-15)", () => {
    expect(formatXaf(-3000)).toBe(`${MINUS}3${NBSP}000${NBSP}F`);
  });

  it("supporte FCFA et l'absence d'unité", () => {
    expect(formatXaf(1500, "FCFA")).toBe(`1${NBSP}500${NBSP}FCFA`);
    expect(formatXaf(1500, "none")).toBe(`1${NBSP}500`);
  });

  it("arrondit à l'entier — le XAF n'a pas de décimales", () => {
    expect(formatXaf(1199.6)).toBe(`1${NBSP}200${NBSP}F`);
  });
});

describe("businessDay (04:00 Africa/Libreville, UTC+1)", () => {
  it("avant 04:00 locale, on est encore sur la journée de la veille", () => {
    // 02:30 UTC = 03:30 Libreville → journée du 24.
    expect(businessDay(new Date("2026-08-25T02:30:00Z"))).toBe("2026-08-24");
  });

  it("après 04:00 locale, la journée courante commence", () => {
    // 03:30 UTC = 04:30 Libreville → journée du 25.
    expect(businessDay(new Date("2026-08-25T03:30:00Z"))).toBe("2026-08-25");
  });

  it("nextCutoff renvoie le prochain 04:00 Libreville en UTC", () => {
    // 10:00 UTC le 25 → prochaine clôture : 26 à 03:00 UTC (04:00 locale).
    expect(nextCutoff(new Date("2026-08-25T10:00:00Z")).toISOString()).toBe(
      "2026-08-26T03:00:00.000Z",
    );
    // 01:00 UTC le 25 (02:00 locale) → clôture du jour même à 03:00 UTC.
    expect(nextCutoff(new Date("2026-08-25T01:00:00Z")).toISOString()).toBe(
      "2026-08-25T03:00:00.000Z",
    );
  });

  it("msUntilCutoff est cohérent avec nextCutoff", () => {
    const at = new Date("2026-08-25T01:00:00Z");
    expect(msUntilCutoff(at)).toBe(2 * 3_600_000);
  });

  it("isBalanceUrgent : débiteur à moins de 4 h de la clôture (D-15 urgence)", () => {
    const twoHoursBefore = new Date("2026-08-26T01:00:00Z");
    const tenHoursBefore = new Date("2026-08-25T17:00:00Z");
    expect(isBalanceUrgent(-3000, twoHoursBefore)).toBe(true);
    expect(isBalanceUrgent(-3000, tenHoursBefore)).toBe(false);
    expect(isBalanceUrgent(0, twoHoursBefore)).toBe(false);
    expect(isBalanceUrgent(5000, twoHoursBefore)).toBe(false);
  });

  it("le seuil d'urgence est configurable (app_config)", () => {
    const tenHoursBefore = new Date("2026-08-25T17:00:00Z");
    expect(isBalanceUrgent(-1, tenHoursBefore, { urgencyHours: 12 })).toBe(true);
  });
});

describe("cancellationFee — max(fixe, % de l'estimation)", () => {
  const config = { fixed: 300, percent: 20 };

  it("le fixe l'emporte sur les petites courses", () => {
    expect(cancellationFee(1000, config)).toBe(300);
  });

  it("le pourcentage l'emporte sur les grosses courses", () => {
    expect(cancellationFee(5000, config)).toBe(1000);
  });

  it("arrondit à l'entier XAF", () => {
    expect(cancellationFee(1503, config)).toBe(301);
  });
});

describe("isValidPinFormat", () => {
  it("accepte exactement 4 chiffres", () => {
    expect(isValidPinFormat("4729")).toBe(true);
    expect(PIN_LENGTH).toBe(4);
  });

  it("refuse tout le reste", () => {
    for (const bad of ["472", "47291", "47a9", "", " 4729", "４７２９"]) {
      expect(isValidPinFormat(bad)).toBe(false);
    }
  });
});
