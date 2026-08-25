import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("@teko/api-client", () => ({
  TekoApiError: class extends Error {
    code = "unknown";
  },
  getCommission: vi.fn(),
  setCommission: vi.fn(),
  listStatements: vi.fn(),
  listPayments: vi.fn(),
  runDailyClose: vi.fn().mockResolvedValue(3),
}));

import { runDailyClose } from "@teko/api-client";
import { DailyCloseButton } from "./daily-close-button";

function renderButton(adminRole: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DailyCloseButton adminRole={adminRole} />
    </QueryClientProvider>,
  );
}

describe("clôture du jour", () => {
  beforeEach(() => vi.clearAllMocks());

  it("double confirmation puis affichage du nombre de relevés créés", async () => {
    renderButton("ops");
    fireEvent.click(screen.getByTestId("close-run"));
    expect(screen.getByText(/irréversible/)).toBeDefined();
    expect(runDailyClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("close-confirm"));
    await waitFor(() => expect(runDailyClose).toHaveBeenCalledTimes(1));
    expect((await screen.findByTestId("close-result")).textContent).toContain("3 relevés créés");
  });

  it("annuler désarme la confirmation sans rien lancer", () => {
    renderButton("superadmin");
    fireEvent.click(screen.getByTestId("close-run"));
    fireEvent.click(screen.getByTestId("close-cancel"));
    expect(screen.getByTestId("close-run")).toBeDefined();
    expect(runDailyClose).not.toHaveBeenCalled();
  });

  it("rôle carto : bouton désactivé avec note", () => {
    renderButton("carto");
    expect((screen.getByTestId("close-run") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Réservé aux rôles ops et superadmin")).toBeDefined();
  });
});
