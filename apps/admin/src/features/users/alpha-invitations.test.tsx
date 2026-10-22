import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ role: "ops", list: vi.fn(), update: vi.fn() }));
vi.mock("@teko/api-client", () => ({
  listAlphaInvites: () => mocks.list(),
  setAlphaInvite: (_client: unknown, input: unknown) => mocks.update(input),
}));
vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("../shell/use-session", () => ({
  useSession: () => ({ session: { user: { id: "ops" } } }),
}));
vi.mock("../shell/use-admin-profile", () => ({
  useAdminProfile: () => ({ adminRole: mocks.role }),
}));

import { AlphaInvitations } from "./alpha-invitations";

function setup() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AlphaInvitations />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "ops";
  mocks.list.mockResolvedValue([
    { id: "invite", phone: "24107000001", role: "client", is_active: true },
  ]);
  mocks.update.mockResolvedValue({});
});
it("Ops retire l'invitation exacte par le serveur et n'envoie aucun SMS", async () => {
  setup();
  fireEvent.click(await screen.findByText("Retirer l’invitation"));
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith({
      phone: "24107000001",
      role: "client",
      active: false,
    }),
  );
  expect(screen.getByText(/n’envoie aucun SMS/)).toBeDefined();
});
it("Finance ne charge ni ne gère la liste d'invitations", () => {
  mocks.role = "finance";
  setup();
  expect(screen.queryByText("Inviter ce numéro")).toBeNull();
  expect(mocks.list).not.toHaveBeenCalled();
});
