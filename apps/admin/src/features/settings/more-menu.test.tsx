import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
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
  getProfile: vi.fn().mockResolvedValue({
    id: "admin-1",
    full_name: "Serge O.",
    role: "admin",
    admin_role: "superadmin",
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

import { signOut } from "@teko/api-client";
import { MoreMenu } from "./more-menu";

function renderMenu() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MoreMenu />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replace.mockClear();
  vi.mocked(signOut).mockClear();
});

describe("AM-07 menu Plus", () => {
  it("affiche le profil et les liens de gestion", async () => {
    renderMenu();
    expect(await screen.findByText("Serge O.")).toBeDefined();
    expect(screen.getByText("Superadmin")).toBeDefined();
    const usersLink = screen.getByTestId("more-link--users");
    expect(usersLink.getAttribute("href")).toBe("/users");
    const journalLink = screen.getByTestId("more-link--settings-tab-journal");
    expect(journalLink.getAttribute("href")).toBe("/settings?tab=journal");
    expect(screen.getAllByText("Lecture").length).toBe(2);
  });

  it("se déconnecter : signOut puis retour /login", async () => {
    renderMenu();
    fireEvent.click(await screen.findByTestId("more-signout"));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
