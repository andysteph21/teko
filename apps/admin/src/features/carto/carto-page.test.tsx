import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// La carte (MapLibre) n'est pas testable en jsdom : next/dynamic est neutralisé.
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("../../lib/supabase", () => ({ supabase: {} }));

const rows = vi.hoisted(() => ({
  landmarks: [
    {
      id: "lm1",
      name: "Boulangerie d'Akébé",
      aliases: [],
      category: "other",
      geom: { type: "Point", coordinates: [9.4612, 0.4101] },
      photo_url: "p.jpg",
      proposed_by: null,
      reviewed_by: null,
      role: "client",
      status: "proposed",
      landmark_id: null,
      created_at: "2026-08-20T10:00:00Z",
    },
  ],
  merged: [
    {
      id: "lm9",
      name: "École de Nzeng-Ayong",
      aliases: [],
      category: "school",
      geom: { type: "Point", coordinates: [9.49, 0.42] },
      photo_url: null,
      proposed_by: null,
      reviewed_by: null,
      role: "driver",
      status: "merged",
      landmark_id: "l9",
      created_at: "2026-08-18T09:00:00Z",
    },
  ],
  roads: [
    {
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
    },
  ],
}));

vi.mock("@teko/api-client", () => ({
  listLandmarkProposals: vi.fn(async (_client, status = "proposed") =>
    status === "proposed" ? rows.landmarks : rows.merged,
  ),
  listRoadProposals: vi.fn(async () => rows.roads),
  validateLandmarkProposal: vi.fn().mockResolvedValue(undefined),
  validateRoadProposal: vi.fn().mockResolvedValue(undefined),
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import {
  listLandmarkProposals,
  validateLandmarkProposal,
  validateRoadProposal,
} from "@teko/api-client";
import { CartoPage } from "./carto-page";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartoPage />
    </QueryClientProvider>,
  );
}

describe("A-04 cartographie", () => {
  it("la file mêle repères et routes avec badge de type, plus ancien d'abord", async () => {
    renderPage();
    await screen.findByText("Boulangerie d'Akébé");
    expect(screen.getByText("Route détectée")).toBeDefined();
    expect(screen.getByText("Repère")).toBeDefined();
    expect(screen.getByText("Route")).toBeDefined();
    const ids = screen.getAllByTestId(/^carto-item-/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual(["carto-item-rd1", "carto-item-lm1"]); // rd1 créée avant lm1
    expect(
      screen.getByText("Un repère validé apparaît dans la recherche client immédiatement."),
    ).toBeDefined();
  });

  it("valider un repère demande confirmation puis appelle la RPC accept=true", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("carto-validate-lm1"));
    expect(screen.getByText("Valider ce repère ?")).toBeDefined();
    fireEvent.click(screen.getByTestId("carto-confirm-lm1"));
    await waitFor(() =>
      expect(validateLandmarkProposal).toHaveBeenCalledWith(expect.anything(), "lm1", true),
    );
  });

  it("rejeter une route (après confirmation) appelle la RPC accept=false", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("carto-reject-rd1"));
    fireEvent.click(screen.getByTestId("carto-confirm-rd1"));
    await waitFor(() =>
      expect(validateRoadProposal).toHaveBeenCalledWith(expect.anything(), "rd1", false),
    );
  });

  it("annuler la confirmation ne déclenche aucune RPC", async () => {
    renderPage();
    vi.mocked(validateLandmarkProposal).mockClear();
    fireEvent.click(await screen.findByTestId("carto-validate-lm1"));
    fireEvent.click(screen.getByTestId("carto-cancel-lm1"));
    expect(validateLandmarkProposal).not.toHaveBeenCalled();
    expect(screen.getByTestId("carto-validate-lm1")).toBeDefined();
  });

  it("l'onglet « Validés récemment » liste les propositions fusionnées", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("carto-tab-validated"));
    await screen.findByText("École de Nzeng-Ayong");
    expect(listLandmarkProposals).toHaveBeenCalledWith(expect.anything(), "merged");
    expect(screen.getByText("Validé")).toBeDefined();
  });
});
