import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("@teko/api-client", () => ({
  listProfiles: vi.fn(),
  listKycQueue: vi.fn(),
  setDriverActive: vi.fn().mockResolvedValue(undefined),
}));

import { listKycQueue, listProfiles, setDriverActive } from "@teko/api-client";
import { UsersPage } from "./users-page";

const driverProfile = {
  id: "drv-1",
  full_name: "Fabrice A.",
  phone: "+24107128843",
  role: "driver",
  created_at: "2026-07-04T09:00:00Z",
  deleted_at: null,
  deletion_requested_at: null,
} as any;

const clientProfile = {
  id: "cli-1",
  full_name: "Nadia O.",
  phone: "+24107020001",
  role: "client",
  created_at: "2026-08-01T09:00:00Z",
  deleted_at: null,
  deletion_requested_at: null,
} as any;

const driverRow = {
  id: "drv-1",
  is_active: true,
  kyc_status: "validated",
  current_balance_cache: "-35800",
  rating_avg: "4.1",
  deactivated_reason: null,
  profiles: { full_name: "Fabrice A.", phone: "+24107128843", created_at: "2026-07-04" },
} as any;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProfiles).mockResolvedValue([driverProfile, clientProfile]);
  vi.mocked(listKycQueue).mockImplementation(async (_client, status = "pending") =>
    status === "validated" ? [driverRow] : [],
  );
});

describe("A-06 utilisateurs", () => {
  it("liste les profils avec rôle et statut", async () => {
    renderPage();
    expect(await screen.findByText("Fabrice A.")).toBeDefined();
    expect(screen.getByText("Nadia O.")).toBeDefined();
    expect(screen.getByText("Chauffeur")).toBeDefined();
    expect(screen.getAllByText("Actif").length).toBeGreaterThan(0);
  });

  it("filtre par rôle → listProfiles({ role: 'driver' })", async () => {
    renderPage();
    await screen.findByText("Fabrice A.");
    fireEvent.click(screen.getByTestId("users-filter-driver"));
    await waitFor(() =>
      expect(listProfiles).toHaveBeenCalledWith(expect.anything(), { role: "driver" }),
    );
  });

  it("suspend un chauffeur avec motif obligatoire", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("user-row-drv-1"));
    expect(screen.getByTestId("user-detail")).toBeDefined();
    fireEvent.click(await screen.findByTestId("driver-toggle-active"));
    const confirm = screen.getByTestId("driver-toggle-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true); // motif vide → inerte
    fireEvent.change(screen.getByTestId("driver-suspend-reason"), {
      target: { value: "solde non réglé" },
    });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(setDriverActive).toHaveBeenCalledWith(
        expect.anything(),
        "drv-1",
        false,
        "solde non réglé",
      ),
    );
  });

  it("affiche la fiche chauffeur (solde, note, KYC)", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("user-row-drv-1"));
    expect(await screen.findByText("KYC validé")).toBeDefined();
    expect(screen.getByText("\u221235 800 F")).toBeDefined();
    expect(screen.getByText("\u2605 4.1")).toBeDefined();
  });
});
