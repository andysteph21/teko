import { QueryClient } from "@tanstack/react-query";

const mockSubscribe = jest.fn();
jest.mock("./history-cache", () => ({ setHistoryCacheOwner: jest.fn() }));
jest.mock("./supabase", () => ({
  supabase: { auth: { onAuthStateChange: (...args: unknown[]) => mockSubscribe(...args) } },
}));

import { useBookingStore } from "../features/booking/store";
import { attachSessionBoundary } from "./session-boundary";

it("efface les données et le brouillon du compte précédent, sans les effacer à chaque renouvellement de jeton", () => {
  let receive: (event: string, session: { user: { id: string } } | null) => void = () => undefined;
  const unsubscribe = jest.fn();
  mockSubscribe.mockImplementation((callback) => {
    receive = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  const cache = new QueryClient();
  const detach = attachSessionBoundary(cache);
  receive("SIGNED_IN", { user: { id: "a" } });
  cache.setQueryData(["my-rides"], [{ id: "private-a" }]);
  useBookingStore.getState().setOrigin({ position: { lon: 9.45, lat: 0.4 }, label: "Maison" });
  receive("TOKEN_REFRESHED", { user: { id: "a" } });
  expect(cache.getQueryData(["my-rides"])).toEqual([{ id: "private-a" }]);
  receive("SIGNED_OUT", null);
  receive("SIGNED_IN", { user: { id: "b" } });
  expect(cache.getQueryData(["my-rides"])).toBeUndefined();
  expect(useBookingStore.getState().origin).toBeNull();
  detach();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});
