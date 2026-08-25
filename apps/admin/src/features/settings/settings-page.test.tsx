import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params,
}));
vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: "admin-1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));
vi.mock("@teko/api-client", () => ({
  getProfile: vi.fn(),
  listAppConfig: vi.fn(),
  updateAppConfig: vi.fn().mockResolvedValue(undefined),
  listProfiles: vi.fn().mockResolvedValue([]),
  listAdminInvites: vi.fn().mockResolvedValue([]),
  inviteAdmin: vi.fn(),
  listAuditLog: vi.fn().mockResolvedValue([]),
  signOut: vi.fn(),
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import { getProfile, listAppConfig, updateAppConfig } from "@teko/api-client";
import { SettingsPage } from "./settings-page";

const superadmin = {
  id: "admin-1",
  full_name: "Serge O.",
  role: "admin",
  admin_role: "superadmin",
} as any;
const ops = { id: "admin-1", full_name: "Aline K.", role: "admin", admin_role: "ops" } as any;

const configRows = [
  {
    key: "commission",
    value: { type: "percent", value: 15 },
    description: "Commission Teko par course.",
    updated_at: "2026-08-12T10:20:05Z",
    updated_by: null,
  },
  {
    key: "landmark_search_radius_m",
    value: 150,
    description: "Rayon de recherche du repère.",
    updated_at: "2026-08-01T08:00:00Z",
    updated_by: null,
  },
] as any;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  params = new URLSearchParams();
  vi.mocked(getProfile).mockResolvedValue(superadmin);
  vi.mocked(listAppConfig).mockResolvedValue(configRows);
});

describe("A-07 paramètres (onglets)", () => {
  it("onglet Paramètres par défaut : table app_config, clé sensible signalée", async () => {
    renderPage();
    expect(await screen.findByText("commission")).toBeDefined();
    expect(screen.getByText("landmark_search_radius_m")).toBeDefined();
    expect(screen.getAllByText("Sensible").length).toBe(1); // commission seulement
    // La commission s'édite côté Finance, même pour un superadmin.
    expect((screen.getByTestId("config-edit-commission") as HTMLButtonElement).disabled).toBe(true);
  });

  it("changer d'onglet persiste dans la querystring", async () => {
    renderPage();
    await screen.findByText("commission");
    fireEvent.click(screen.getByTestId("settings-tab-journal"));
    expect(replace).toHaveBeenCalledWith("/settings?tab=journal");
  });

  it("édition inline superadmin : JSON validé puis updateAppConfig", async () => {
    renderPage();
    await screen.findByText("commission");
    const editButton = await screen.findByTestId("config-edit-landmark_search_radius_m");
    await waitFor(() => expect((editButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(editButton);
    fireEvent.change(screen.getByTestId("config-value-landmark_search_radius_m"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByTestId("config-save-landmark_search_radius_m"));
    await waitFor(() =>
      expect(updateAppConfig).toHaveBeenCalledWith(
        expect.anything(),
        "landmark_search_radius_m",
        200,
      ),
    );
  });

  it("admin non superadmin : édition désactivée avec note", async () => {
    vi.mocked(getProfile).mockResolvedValue(ops);
    renderPage();
    const editButton = await screen.findByTestId("config-edit-landmark_search_radius_m");
    expect((editButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText("Réservé au superadmin").length).toBeGreaterThan(0);
  });

  it("?tab=roles : matrice statique en lecture seule", async () => {
    params = new URLSearchParams("tab=roles");
    renderPage();
    expect(await screen.findByText("Valider / refuser un dossier KYC")).toBeDefined();
    expect(screen.getByText(/appliquée par la base \(RLS\)/)).toBeDefined();
  });
});
