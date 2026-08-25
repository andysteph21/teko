import { describe, expect, it } from "vitest";
import { createTekoI18n, fr } from "./index";

describe("createTekoI18n", () => {
  it("sert les textes français dès l'initialisation", async () => {
    const i18n = await createTekoI18n();
    expect(i18n.t("commun.continuer")).toBe("Continuer");
    expect(i18n.t("auth.recevoirCode")).toBe("Recevoir le code");
    expect(i18n.t("erreurs.horsLigne")).toBe("Vous êtes hors ligne");
  });

  it("retombe sur le français pour une langue non couverte (ADR-08)", async () => {
    const i18n = await createTekoI18n({ lng: "en" });
    expect(i18n.t("commun.annuler")).toBe("Annuler");
  });

  it("expose les ressources brutes pour l'outillage", () => {
    expect(fr.commun.appNameClient).toBe("Teko");
    expect(fr.commun.appNameDriver).toBe("Teko Chauffeur");
  });

  it("accepte les plugins de l'app hôte", async () => {
    let installed = false;
    const plugin = {
      type: "3rdParty" as const,
      init: () => {
        installed = true;
      },
    };
    await createTekoI18n({ plugins: [plugin] });
    expect(installed).toBe(true);
  });
});
