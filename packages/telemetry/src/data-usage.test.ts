import { describe, expect, it } from "vitest";
import { budgetState, DataUsageMeter, DEFAULT_BUDGET, formatMo } from "./index";

const NBSP = " ";

describe("budgetState — 100 Mo, alerte 50 %, critique 80 % (n° 19)", () => {
  it("suit les seuils actés", () => {
    expect(budgetState(0)).toBe("normal");
    expect(budgetState(49_999_999)).toBe("normal");
    expect(budgetState(50_000_000)).toBe("alerte");
    expect(budgetState(79_999_999)).toBe("alerte");
    expect(budgetState(80_000_000)).toBe("critique");
    expect(budgetState(150_000_000)).toBe("critique");
  });

  it("accepte une configuration différente (app_config)", () => {
    const config = { ...DEFAULT_BUDGET, budgetBytes: 10_000_000 };
    expect(budgetState(5_000_000, config)).toBe("alerte");
  });
});

describe("formatMo", () => {
  it("affiche les Mo avec virgule française et espace insécable", () => {
    expect(formatMo(12_400_000)).toBe(`12,4${NBSP}Mo`);
    expect(formatMo(1_000_000)).toBe(`1,0${NBSP}Mo`);
  });

  it("bascule en ko sous 1 Mo", () => {
    expect(formatMo(870_000)).toBe(`870${NBSP}ko`);
    expect(formatMo(0)).toBe(`0${NBSP}ko`);
  });
});

describe("DataUsageMeter", () => {
  it("accumule et notifie les abonnés", () => {
    const meter = new DataUsageMeter(1_000);
    const seen: number[] = [];
    const unsubscribe = meter.subscribe((total) => seen.push(total));

    meter.record(500);
    meter.record(250);
    expect(meter.totalBytes).toBe(1_750);
    expect(seen).toEqual([1_500, 1_750]);

    unsubscribe();
    meter.record(100);
    expect(seen).toEqual([1_500, 1_750]);
  });

  it("ignore les valeurs invalides (jamais de compteur qui recule)", () => {
    const meter = new DataUsageMeter();
    meter.record(-5);
    meter.record(Number.NaN);
    meter.record(0);
    expect(meter.totalBytes).toBe(0);
  });

  it("reset : remise à zéro au changement de mois, abonnés prévenus", () => {
    const meter = new DataUsageMeter(9_999);
    let last = -1;
    meter.subscribe((total) => {
      last = total;
    });
    meter.reset();
    expect(meter.totalBytes).toBe(0);
    expect(last).toBe(0);
  });
});
