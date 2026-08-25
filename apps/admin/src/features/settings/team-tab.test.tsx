import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  listProfiles: vi.fn(),
  listAdminInvites: vi.fn(),
  inviteAdmin: vi.fn().mockResolvedValue({}),
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import { getProfile, inviteAdmin, listAdminInvites, listProfiles } from "@teko/api-client";
import { TeamTab } from "./team-tab";

const superadmin = {
  id: "admin-1",
  full_name: "Serge O.",
  phone: "+24106552109",
  role: "admin",
  admin_role: "superadmin",
  last_seen_at: new Date().toISOString(),
} as any;

const pendingInvite = {
  id: "inv-1",
  phone: "+24106127703",
  admin_role: "finance",
  accepted_at: null,
  accepted_by: null,
  invited_by: "admin-1",
  created_at: "2026-08-17T09:15:51Z",
  expires_at: "2099-01-01T00:00:00Z",
} as any;

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamTab />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProfile).mockResolvedValue(superadmin);
  vi.mocked(listProfiles).mockResolvedValue([superadmin]);
  vi.mocked(listAdminInvites).mockResolvedValue([pendingInvite]);
});

describe("A-08 équipe", () => {
  it("liste les comptes admin et les invitations en attente", async () => {
    renderTab();
    expect(await screen.findByText(/Serge O\./)).toBeDefined();
    expect(await screen.findByText("Invitation envoyée")).toBeDefined();
    expect(screen.getByText(/1 invitation en attente/)).toBeDefined();
  });

  it("invitation superadmin : +241 normalisé et rôle transmis à inviteAdmin", async () => {
    renderTab();
    const phone = await screen.findByTestId("invite-phone");
    await waitFor(() => expect((phone as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(phone, { target: { value: "06 12 77 03" } });
    fireEvent.click(screen.getByTestId("invite-role-finance"));
    fireEvent.click(screen.getByTestId("invite-submit"));
    await waitFor(() =>
      expect(inviteAdmin).toHaveBeenCalledWith(expect.anything(), "+24106127703", "finance"),
    );
    expect(await screen.findByText("Invitation envoyée.")).toBeDefined();
  });
});
