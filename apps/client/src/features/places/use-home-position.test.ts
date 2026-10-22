import { act, renderHook, waitFor } from "@testing-library/react-native";

const mockPermission = jest.fn();
const mockPosition = jest.fn();
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: () => mockPermission(),
  getCurrentPositionAsync: () => mockPosition(),
  Accuracy: { Balanced: 3 },
}));

import { useBookingStore } from "../booking/store";
import { useHomePosition } from "./use-home-position";

beforeEach(() => {
  useBookingStore.getState().reset();
  mockPermission.mockResolvedValue({ status: "granted" });
  mockPosition.mockResolvedValue({ coords: { longitude: 9.45, latitude: 0.4 } });
});
it("le retour à l'accueil ne remplace pas le départ choisi par le GPS", async () => {
  const origin = { position: { lon: 9.47, lat: 0.42 }, label: "Repère choisi", landmarkId: "lm-1" };
  useBookingStore.getState().setOrigin(origin);
  const { result } = renderHook(useHomePosition);
  await waitFor(() => expect(result.current).toEqual({ lon: 9.45, lat: 0.4 }));
  expect(useBookingStore.getState().origin).toEqual(origin);
});
it("un refus GPS laisse le départ vide pour le choix manuel", async () => {
  mockPermission.mockResolvedValue({ status: "denied" });
  const { result } = renderHook(useHomePosition);
  await act(async () => undefined);
  expect(result.current).toBeNull();
  expect(useBookingStore.getState().origin).toBeNull();
});
it("un résultat GPS tardif après la sortie de l'écran ne réécrit pas le brouillon", async () => {
  let resolve: (value: unknown) => void = () => undefined;
  mockPosition.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { unmount } = renderHook(useHomePosition);
  await waitFor(() => expect(mockPosition).toHaveBeenCalled());
  unmount();
  await act(async () => resolve({ coords: { longitude: 9.45, latitude: 0.4 } }));
  expect(useBookingStore.getState().origin).toBeNull();
});
