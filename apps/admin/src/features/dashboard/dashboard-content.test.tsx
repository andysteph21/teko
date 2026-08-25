import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatXaf } from "@teko/core";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeIncident, makeRide } from "./fixtures";

vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("./live-map-card", () => ({
  LiveMapCard: () => <section data-testid="live-map-card" />,
}));
vi.mock("../shell/use-nav-badges", () => ({ useNavBadges: () => ({ carto: 5 }) }));
vi.mock("@teko/api-client", () => ({
  dashboardCounts: vi.fn(),
  listRecentRides: vi.fn(),
  listIncidents: vi.fn(),
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import { dashboardCounts, listIncidents, listRecentRides } from "@teko/api-client";
import { DashboardContent } from "./dashboard-content";

beforeEach(() => {
  vi.mocked(dashboardCounts).mockResolvedValue({
    activeRides: 23,
    onlineDrivers: 87,
    pendingKyc: 12,
    openIncidents: 2,
  });
  vi.mocked(listRecentRides).mockResolvedValue([
    makeRide({ price_final: 412500, payment_method: "airtel" }),
  ]);
  vi.mocked(listIncidents).mockResolvedValue([makeIncident({ id: "i1" })]);
});

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardContent />
    </QueryClientProvider>,
  );
}

describe("A-02 tableau de bord", () => {
  it("affiche les KPI réels et le volume du jour calculé côté client", async () => {
    renderDashboard();
    expect(await screen.findByText("23")).toBeDefined();
    expect(screen.getByText("87")).toBeDefined();
    // Le normaliseur Testing Library réduit l'insécable de formatXaf en espace.
    expect(await screen.findByText(formatXaf(412500).replace(/\u00a0/g, " "))).toBeDefined();
    // Temps d'attribution médian : pas encore de calcul backend → « — ».
    expect(screen.getByText("Temps d'attribution médian")).toBeDefined();
  });

  it("fusionne le flux : SOS rouge cliquable vers la page incidents", async () => {
    renderDashboard();
    expect(await screen.findByText("SOS déclenché")).toBeDefined();
    const link = screen.getByTestId("feed-sos-incident-i1") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/incidents");
    expect(screen.getByText("Course terminée")).toBeDefined();
  });

  it("bloc « À traiter » mobile : compteurs KYC, carto et incidents", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId("todo-kyc").textContent).toContain("12"));
    expect(screen.getByTestId("todo-carto").textContent).toContain("5");
    expect(screen.getByTestId("todo-incidents").textContent).toContain("2");
  });
});
