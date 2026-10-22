import { describe, expect, it, vi } from "vitest";

vi.mock("@teko/api-client", () => ({
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import type { DocumentRow } from "./kyc-labels";
import { initials, isNearSla, pendingRequiredTypes, relativeFr } from "./kyc-labels";

const NOW = Date.parse("2026-08-25T12:00:00Z");
const HOUR = 3_600_000;

function doc(type: string, status: string, createdAt: string): DocumentRow {
  return { type, status, created_at: createdAt } as unknown as DocumentRow;
}

describe("kyc-labels", () => {
  it("ancienneté relative française : minutes, heures jusqu'à 48 h, puis jours", () => {
    expect(relativeFr(new Date(NOW - 30_000).toISOString(), NOW)).toBe("à l'instant");
    expect(relativeFr(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe("il y a 5 min");
    expect(relativeFr(new Date(NOW - 4 * HOUR).toISOString(), NOW)).toBe("il y a 4 h");
    expect(relativeFr(new Date(NOW - 50 * HOUR).toISOString(), NOW)).toBe("il y a 2 j");
  });

  it("dossier proche de l'engagement 48 h à partir de 24 h", () => {
    expect(isNearSla(new Date(NOW - 4 * HOUR).toISOString(), NOW)).toBe(false);
    expect(isNearSla(new Date(NOW - 31 * HOUR).toISOString(), NOW)).toBe(true);
  });

  it("initiales sur les deux premiers mots du nom", () => {
    expect(initials("Steeve Obame")).toBe("SO");
    expect(initials("Marielle")).toBe("M");
    expect(initials(null)).toBe("?");
  });

  it("re-soumission : la pièce la plus récente prime sur l'ancienne validée", () => {
    const docs = [
      // Listes triées desc (comme listDriverDocuments) : la re-soumission d'abord.
      doc("license", "pending", "2026-08-25T10:00:00Z"),
      doc("license", "validated", "2026-08-20T10:00:00Z"),
      doc("id_card", "validated", "2026-08-20T10:00:00Z"),
      doc("registration", "validated", "2026-08-20T10:00:00Z"),
      doc("insurance", "validated", "2026-08-20T10:00:00Z"),
      doc("vehicle_photo", "validated", "2026-08-20T10:00:00Z"),
      doc("criminal_record", "validated", "2026-08-20T10:00:00Z"),
      doc("profile_photo", "validated", "2026-08-20T10:00:00Z"),
    ];
    expect(pendingRequiredTypes(docs)).toEqual(["license"]);
  });

  it("la photo de profil doit être validée pour activer le chauffeur alpha", () => {
    const docs = [
      doc("id_card", "validated", "2026-08-20T10:00:00Z"),
      doc("license", "validated", "2026-08-20T10:00:00Z"),
      doc("registration", "validated", "2026-08-20T10:00:00Z"),
      doc("insurance", "validated", "2026-08-20T10:00:00Z"),
      doc("vehicle_photo", "validated", "2026-08-20T10:00:00Z"),
      doc("criminal_record", "validated", "2026-08-20T10:00:00Z"),
      doc("profile_photo", "pending", "2026-08-20T10:00:00Z"),
    ];
    expect(pendingRequiredTypes(docs)).toEqual(["profile_photo"]);
  });
});
