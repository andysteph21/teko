import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Keyboard } from "react-native";

const mockStart = jest.fn();
jest.mock("@teko/api-client", () => ({
  startRide: (...args: unknown[]) => mockStart(...args),
  TekoApiError: class extends Error {
    code = "pin_incorrect";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import type { RideRow } from "@teko/types";
import { useRideActions } from "./use-ride-actions";

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());
it("ferme le clavier avant d'appliquer le statut qui démonte le champ PIN (OPPO)", async () => {
  const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
  const apply = jest.fn();
  const started = { id: "ride", status: "started" } as RideRow;
  mockStart.mockResolvedValue(started);
  const hook = renderHook(() => useRideActions("ride", apply));
  act(() => hook.result.current.start("1234"));
  await waitFor(() => expect(apply).toHaveBeenCalledWith(started));
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(dismiss.mock.invocationCallOrder[0]).toBeLessThan(apply.mock.invocationCallOrder[0]!);
});
it("garde la saisie ouverte si le serveur refuse le PIN", async () => {
  const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
  const apply = jest.fn();
  const { TekoApiError } = jest.requireMock("@teko/api-client");
  mockStart.mockRejectedValue(new TekoApiError());
  const hook = renderHook(() => useRideActions("ride", apply));
  act(() => hook.result.current.start("1234"));
  await waitFor(() => expect(hook.result.current.pinError).toBe("work:pin.incorrect"));
  expect(dismiss).not.toHaveBeenCalled();
  expect(apply).not.toHaveBeenCalled();
});
