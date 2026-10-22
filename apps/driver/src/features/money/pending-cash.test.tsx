import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";

const mockClaims = jest.fn();
jest.mock("@teko/api-client", () => ({
  listCancellationClaims: () => mockClaims(),
  listPayoutRequests: jest.fn(async () => [
    { id: "payout", business_day: "2026-10-18", amount: 500 },
  ]),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "driver" } } }),
}));

import { PendingCash } from "./pending-cash";

it("distingue la part non encaissée et le versement encore en attente du solde disponible", async () => {
  mockClaims.mockResolvedValue([{ id: "claim", driver_share: 224 }]);
  const cache = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  render(
    <QueryClientProvider client={cache}>
      <PendingCash />
    </QueryClientProvider>,
  );
  expect(await screen.findByTestId("pending-cash")).toBeOnTheScreen();
  expect(screen.getByText(/224.*non créditée avant encaissement complet/)).toBeOnTheScreen();
  expect(screen.getByText(/500.*en attente de justificatif validé/)).toBeOnTheScreen();
});
