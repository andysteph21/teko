import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("@teko/api-client", () => ({
  TekoApiError: class extends Error {
    code = "unknown";
  },
  getCommission: vi.fn().mockResolvedValue({ type: "percent", value: 15 }),
  setCommission: vi.fn().mockResolvedValue(undefined),
  listStatements: vi.fn(),
  listPayments: vi.fn(),
  runDailyClose: vi.fn(),
}));

import { setCommission } from "@teko/api-client";
import { CommissionBanner } from "./commission-banner";

function renderBanner(adminRole: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommissionBanner adminRole={adminRole} />
    </QueryClientProvider>,
  );
}

describe("bandeau commission", () => {
  it("superadmin : édition, confirmation explicite puis set_commission", async () => {
    renderBanner("superadmin");
    await waitFor(() =>
      expect(screen.getByTestId("commission-value").textContent).toContain("15 % par course"),
    );
    fireEvent.click(screen.getByTestId("commission-edit"));
    fireEvent.change(screen.getByTestId("commission-input"), { target: { value: "12" } });
    fireEvent.click(screen.getByTestId("commission-continue"));

    // Étape de confirmation explicite — rien n'est encore envoyé.
    expect(screen.getByText(/prochaines\s+courses/)).toBeDefined();
    expect(setCommission).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("commission-confirm"));
    await waitFor(() =>
      expect(setCommission).toHaveBeenCalledWith(expect.anything(), "percent", 12),
    );
  });

  it("un pourcentage > 100 bloque l'étape suivante", async () => {
    renderBanner("superadmin");
    await screen.findByTestId("commission-edit");
    fireEvent.click(screen.getByTestId("commission-edit"));
    fireEvent.change(screen.getByTestId("commission-input"), { target: { value: "150" } });
    expect((screen.getByTestId("commission-continue") as HTMLButtonElement).disabled).toBe(true);
  });

  it("rôle non superadmin : bouton désactivé avec note", async () => {
    renderBanner("finance");
    await screen.findByTestId("commission-edit");
    expect((screen.getByTestId("commission-edit") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Réservé au superadmin")).toBeDefined();
  });
});
