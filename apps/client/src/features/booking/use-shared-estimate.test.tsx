// R4 — devis covoiturage : fermé par défaut (option masquée sans erreur),
// ouvert → devis et prix total rangés dans le brouillon, places transmises.

import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

const mockQuote = jest.fn();
jest.mock("@teko/api-client", () => ({
  ...jest.requireActual("@teko/api-client"),
  getRideQuote: (...args: unknown[]) => mockQuote(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

import { TekoApiError } from "@teko/api-client";
import { createQueryClient } from "../../lib/query-client";
import { useBookingStore } from "./store";
import { useSharedEstimate } from "./use-shared-estimate";

const ORIGIN = { position: { lon: 9.45, lat: 0.4 }, label: "Départ" };
const DESTINATION = { position: { lon: 9.47, lat: 0.41 }, label: "Arrivée" };

function renderShared() {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useSharedEstimate(), { wrapper }), client };
}

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useBookingStore.setState({ origin: ORIGIN, destination: DESTINATION });
});

it("service fermé : option indisponible, brouillon ramené à une catégorie ouverte", async () => {
  useBookingStore.setState({ category: "covoiturage" });
  mockQuote.mockRejectedValue(new TekoApiError("service_closed", "SERVICE_CLOSED"));
  const hook = renderShared();
  await waitFor(() => expect(hook.result.current.updating).toBe(false));
  expect(hook.result.current.available).toBe(false);
  expect(useBookingStore.getState().quotes.covoiturage).toBeUndefined();
  expect(useBookingStore.getState().category).toBe("eco");
  hook.unmount();
  hook.client.clear();
});

it("service ouvert : devis demandé avec les places, prix total serveur dans le brouillon", async () => {
  mockQuote.mockImplementation(async (_client: unknown, input: { seats: number }) => ({
    id: `q-${input.seats}`,
    category: "covoiturage",
    seats: input.seats,
    price: String(775 * input.seats),
  }));
  useBookingStore.setState({ estimates: { eco: 1500 } });
  const hook = renderShared();
  await waitFor(() => expect(hook.result.current.available).toBe(true));
  expect(mockQuote).toHaveBeenCalledWith(
    {},
    {
      category: "covoiturage",
      origin: ORIGIN.position,
      destination: DESTINATION.position,
      seats: 1,
    },
  );
  expect(useBookingStore.getState().estimates).toEqual({ eco: 1500, covoiturage: 775 });

  act(() => useBookingStore.getState().setSeats(3));
  await waitFor(() => expect(useBookingStore.getState().quotes.covoiturage?.id).toBe("q-3"));
  expect(useBookingStore.getState().estimates.covoiturage).toBe(2325);

  // Retour à une place : le devis relu du cache redevient celui du brouillon.
  act(() => useBookingStore.getState().setSeats(1));
  await waitFor(() => expect(useBookingStore.getState().quotes.covoiturage?.id).toBe("q-1"));
  hook.unmount();
  hook.client.clear();
});
