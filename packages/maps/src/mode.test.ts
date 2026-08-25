import { describe, expect, it } from "vitest";
import { resolveMapMode } from "./mode";

describe("resolveMapMode (préférence × réseau, C-25)", () => {
  it("préférences explicites : éco et complet ignorent le réseau", () => {
    expect(resolveMapMode("eco", { effectiveType: "4g" }).mode).toBe("eco");
    expect(resolveMapMode("complet", { effectiveType: "2g" }).mode).toBe("complet");
  });
  it("auto : bascule en éco sous 2G et slow-2g", () => {
    expect(resolveMapMode("auto", { effectiveType: "2g" }).mode).toBe("eco");
    expect(resolveMapMode("auto", { effectiveType: "slow-2g" }).mode).toBe("eco");
    expect(resolveMapMode("auto", { effectiveType: "3g" }).mode).toBe("complet");
    expect(resolveMapMode("auto", { effectiveType: "4g" }).mode).toBe("complet");
  });
  it("auto : respecte l'économiseur de données du système", () => {
    const r = resolveMapMode("auto", { effectiveType: "4g", saveData: true });
    expect(r.mode).toBe("eco");
    expect(r.raison).toMatch(/économiseur/);
  });
  it("auto sans information réseau : complet", () => {
    expect(resolveMapMode("auto").mode).toBe("complet");
  });
  it("la raison est affichable (réseau lent nommé)", () => {
    expect(resolveMapMode("auto", { effectiveType: "2g" }).raison).toMatch(/2g/);
  });
});
