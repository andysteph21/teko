import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeIncident } from "./fixtures";

vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("@teko/api-client", () => ({
  listIncidents: vi.fn(),
  updateIncident: vi.fn(),
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import { listIncidents, updateIncident } from "@teko/api-client";
import { IncidentsContent } from "./incidents-content";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listIncidents).mockResolvedValue([
    makeIncident({ id: "rep1", kind: "report", created_at: "2026-08-25T12:00:00Z" }),
    makeIncident({ id: "sos1", kind: "sos", created_at: "2026-08-25T10:00:00Z" }),
    makeIncident({ id: "res1", kind: "dispute", status: "resolved" }),
  ]);
  vi.mocked(updateIncident).mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

function renderIncidents() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IncidentsContent />
    </QueryClientProvider>,
  );
}

describe("AM-06 incidents & SOS", () => {
  it("liste triée : SOS ouvert en tête, résolu en queue, sans actions", async () => {
    renderIncidents();
    const cards = await screen.findAllByRole("article");
    expect(cards[0]?.getAttribute("data-testid")).toBe("incident-sos1");
    expect(cards[2]?.getAttribute("data-testid")).toBe("incident-res1");
    expect(screen.queryByTestId("incident-resolve-res1")).toBeNull();
  });

  it("« Prendre en charge » confirme puis passe l'incident en in_progress", async () => {
    renderIncidents();
    fireEvent.click(await screen.findByTestId("incident-take-sos1"));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() =>
      expect(updateIncident).toHaveBeenCalledWith(expect.anything(), "sos1", "in_progress"),
    );
  });

  it("« Marquer résolu » refusé à la confirmation : aucun appel", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderIncidents();
    fireEvent.click(await screen.findByTestId("incident-resolve-sos1"));
    expect(updateIncident).not.toHaveBeenCalled();
  });
});
