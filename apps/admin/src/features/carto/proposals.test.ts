// Logique pure de la modération carto : géométries, fusion de file, libellés.

import { TekoApiError } from "@teko/api-client";
import { describe, expect, it } from "vitest";
import {
  buildQueue,
  categoryLabel,
  type LandmarkProposalRow,
  landmarkItem,
  landmarkPoint,
  type RoadProposalRow,
  reviewErrorMessage,
  roadItem,
  roadPath,
} from "./proposals";

const landmarkRow = (over: Partial<LandmarkProposalRow> = {}): LandmarkProposalRow => ({
  id: "lm1",
  name: "Boulangerie d'Akébé",
  aliases: [],
  category: "other",
  geom: { type: "Point", coordinates: [9.4612, 0.4101] },
  photo_url: null,
  proposed_by: null,
  reviewed_by: null,
  role: "client",
  status: "proposed",
  landmark_id: null,
  created_at: "2026-08-20T10:00:00Z",
  ...over,
});

const roadRow = (over: Partial<RoadProposalRow> = {}): RoadProposalRow => ({
  id: "rd1",
  geom: {
    type: "LineString",
    coordinates: [
      [9.44, 0.4],
      [9.45, 0.41],
    ],
  },
  support_count: 14,
  distinct_drivers: 9,
  derived_from: {},
  reviewed_by: null,
  status: "proposed",
  window_start: null,
  window_end: null,
  created_at: "2026-08-19T08:00:00Z",
  ...over,
});

describe("géométries Supabase", () => {
  it("landmarkPoint lit un Point GeoJSON (sérialisation PostgREST)", () => {
    expect(landmarkPoint({ type: "Point", coordinates: [9.46, 0.41] })).toEqual({
      lon: 9.46,
      lat: 0.41,
    });
  });

  it("landmarkPoint rend null sur géométrie illisible (pas de crash UI)", () => {
    expect(landmarkPoint(null)).toBeNull();
    expect(landmarkPoint("zz-pas-de-l-hex")).toBeNull();
  });

  it("roadPath lit un LineString GeoJSON et ignore le reste", () => {
    expect(roadPath({ type: "LineString", coordinates: [[9.4, 0.4]] })).toEqual([
      { lon: 9.4, lat: 0.4 },
    ]);
    expect(roadPath("0102000020E6100000")).toEqual([]); // EWKB hex : non décodé (TODO)
    expect(roadPath({ type: "Point", coordinates: [9.4, 0.4] })).toEqual([]);
  });
});

describe("file de modération", () => {
  it("mêle repères et routes, plus ancien d'abord", () => {
    const queue = buildQueue([landmarkRow()], [roadRow()]);
    expect(queue.map((i) => i.kind)).toEqual(["road", "landmark"]);
  });

  it("libellé repère : rôle du proposant, photo, catégorie, alias", () => {
    const item = landmarkItem(
      landmarkRow({ photo_url: "p.jpg", category: "market", aliases: ["chez Nadia"] }),
    );
    expect(item.detail).toBe(
      "Proposé par un client · photo jointe · catégorie Marché · alias : chez Nadia.",
    );
    expect(item.points).toHaveLength(1);
  });

  it("libellé route : traces GPS et chauffeurs distincts", () => {
    const item = roadItem(roadRow());
    expect(item.detail).toBe("Détectée depuis 14 traces GPS anonymisées (9 chauffeurs distincts).");
    expect(item.points).toHaveLength(2);
  });

  it("categoryLabel tolère une catégorie inconnue", () => {
    expect(categoryLabel("school")).toBe("École");
    expect(categoryLabel("mystery")).toBe("mystery");
    expect(categoryLabel(null)).toBe("");
  });
});

describe("messages d'erreur", () => {
  it("code stable → message français, jamais de string-match", () => {
    expect(reviewErrorMessage(new TekoApiError("network", "TypeError: fetch failed"))).toBe(
      "Connexion impossible. Vérifiez le réseau.",
    );
    expect(reviewErrorMessage(new TekoApiError("not_authorized", "permission denied"))).toBe(
      "Action réservée aux administrateurs.",
    );
    expect(
      reviewErrorMessage(new TekoApiError("unknown", "Proposition déjà traitée (merged)")),
    ).toBe("Proposition déjà traitée (merged)");
    expect(reviewErrorMessage(new Error("boom"))).toBe("L'action a échoué. Réessayez.");
  });
});
