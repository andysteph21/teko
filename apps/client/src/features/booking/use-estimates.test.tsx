import { focusManager, onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

const mockQuote = jest.fn();
const mockNetwork = jest.fn();
jest.mock("@teko/api-client", () => ({
  ...jest.requireActual("@teko/api-client"),
  getRideQuote: (...args: unknown[]) => mockQuote(...args),
}));
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: () => mockNetwork() },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

import { TekoApiError } from "@teko/api-client";
import { createQueryClient } from "../../lib/query-client";
import { useBookingStore } from "./store";
import { useEstimates } from "./use-estimates";

const clients: ReturnType<typeof createQueryClient>[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useBookingStore.setState({
    origin: { position: { lon: 9.45, lat: 0.4 }, label: "Départ" },
    destination: { position: { lon: 9.47, lat: 0.41 }, label: "Arrivée" },
  });
  mockQuote.mockRejectedValue(new TekoApiError("unknown", "Service unavailable"));
  mockNetwork.mockResolvedValue({ isConnected: true, isInternetReachable: true });
});
afterEach(() => {
  for (const client of clients) client.clear();
  clients.length = 0;
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
});

function renderEstimates() {
  const client = createQueryClient();
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useEstimates(), { wrapper }), client };
}

it.each([
  [{ isConnected: false }, "network"],
  [{ isConnected: true, isInternetReachable: false }, "network"],
  [{ isConnected: true, isInternetReachable: true }, "unknown"],
  [{ isConnected: null, isInternetReachable: null }, "unknown"],
])("qualifie la panne avec l'état réseau constaté %o", async (network, code) => {
  mockNetwork.mockResolvedValue(network);
  const hook = renderEstimates();
  await waitFor(() => expect(hook.result.current.isError).toBe(true));
  expect(hook.result.current.error).toMatchObject({ code });
  hook.unmount();
  hook.client.clear();
});

it("une reconnexion ne relance pas les devis ; seul le réessai manuel le fait", async () => {
  onlineManager.setOnline(false);
  const hook = renderEstimates();
  await waitFor(() => expect(hook.result.current.isError).toBe(true));
  expect(mockQuote).toHaveBeenCalledTimes(3);
  await act(async () => {
    onlineManager.setOnline(true);
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
  expect(mockQuote).toHaveBeenCalledTimes(3);
  await act(async () => {
    await hook.result.current.refetch();
  });
  expect(mockQuote).toHaveBeenCalledTimes(6);
  hook.unmount();
  hook.client.clear();
});
