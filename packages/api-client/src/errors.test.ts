import { describe, expect, it } from "vitest";
import { mapApiError, TekoApiError, unwrap } from "./errors.js";

describe("mapApiError — messages backend → codes stables", () => {
  const cases: [string, string][] = [
    ["Aucune offre active", "no_active_offer"],
    ["Offre déjà traitée", "offer_already_handled"],
    ["Offre expirée", "offer_expired"],
    ["PIN incorrect", "pin_incorrect"],
    ["Réservé aux participants de la course", "participants_only"],
    ["Réservé au superadmin", "superadmin_only"],
    ["Suppression impossible : une course est en cours", "ride_in_progress"],
    ["Modification du rôle non autorisée", "role_change_forbidden"],
    ["TypeError: Failed to fetch", "network"],
    ["Network request failed", "network"],
  ];

  it.each(cases)("« %s » → %s", (message, code) => {
    const error = mapApiError({ message });
    expect(error).toBeInstanceOf(TekoApiError);
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  });

  it("42501 (privilèges PostgREST) → not_authorized", () => {
    expect(mapApiError({ code: "42501", message: "permission denied for table rides" }).code).toBe(
      "not_authorized",
    );
  });

  it("le message prime sur le code (superadmin_only plus précis que 42501)", () => {
    expect(mapApiError({ code: "42501", message: "Réservé au superadmin" }).code).toBe(
      "superadmin_only",
    );
  });

  it("message inconnu → unknown, cause conservée", () => {
    const raw = { message: "quelque chose d'inédit" };
    const error = mapApiError(raw);
    expect(error.code).toBe("unknown");
    expect(error.cause).toBe(raw);
  });

  it("les TekoApiError repassent inchangées", () => {
    const original = new TekoApiError("pin_incorrect", "PIN incorrect");
    expect(mapApiError(original)).toBe(original);
  });

  it("supporte les valeurs non-objet", () => {
    expect(mapApiError("boom").code).toBe("unknown");
  });
});

describe("unwrap", () => {
  it("renvoie data quand il n'y a pas d'erreur", () => {
    expect(unwrap({ data: 42, error: null })).toBe(42);
  });

  it("lève une TekoApiError mappée sinon", () => {
    expect(() => unwrap({ data: null, error: { message: "PIN incorrect" } })).toThrowError(
      TekoApiError,
    );
    try {
      unwrap({ data: null, error: { message: "PIN incorrect" } });
    } catch (error) {
      expect((error as TekoApiError).code).toBe("pin_incorrect");
    }
  });
});
