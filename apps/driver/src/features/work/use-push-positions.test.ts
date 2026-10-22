import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

const mockConfigure = jest.fn().mockResolvedValue(undefined);
jest.mock("../../lib/location-service", () => ({
  configureDriverLocation: (...args: unknown[]) => mockConfigure(...args),
}));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "driver" } } }),
}));

import { usePushPositions } from "./use-push-positions";

let resume: (state: AppStateStatus) => void;
const remove = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    resume = listener;
    return { remove };
  });
});
afterEach(() => jest.restoreAllMocks());

it("un statut encore inconnu ne supprime pas la course conservée par le service", () => {
  const hook = renderHook<void, { active: boolean | undefined }>(
    ({ active }) => usePushPositions("ride", active, false),
    {
      initialProps: { active: undefined as boolean | undefined },
    },
  );
  expect(mockConfigure).not.toHaveBeenCalled();
  hook.rerender({ active: true });
  expect(mockConfigure).toHaveBeenCalledWith({ userId: "driver", rideId: "ride", eco: false });
});

it("le retour au premier plan réarme le suivi de la course sans redémarrer en arrière-plan", () => {
  const hook = renderHook(() => usePushPositions("ride", true, false));
  mockConfigure.mockClear();
  act(() => resume("background"));
  expect(mockConfigure).not.toHaveBeenCalled();
  act(() => resume("active"));
  expect(mockConfigure).toHaveBeenCalledTimes(1);
  expect(mockConfigure).toHaveBeenCalledWith({ userId: "driver", rideId: "ride", eco: false });
  hook.unmount();
  expect(remove).toHaveBeenCalled();
});

it("une clôture connue retire explicitement la course du service", () => {
  renderHook(() => usePushPositions("ride", false, true));
  expect(mockConfigure).toHaveBeenCalledWith({ userId: "driver", rideId: null, eco: true });
});
