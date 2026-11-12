import { act, renderHook, waitFor } from "@testing-library/react-native";

const mockPermission = jest.fn();
const mockPosition = jest.fn();
const mockRequest = jest.fn();
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: () => mockPermission(),
  requestForegroundPermissionsAsync: () => mockRequest(),
  getCurrentPositionAsync: () => mockPosition(),
  Accuracy: { Balanced: 3, High: 4 },
}));

import { useBookingStore } from "../booking/store";
import { useHomePosition } from "./use-home-position";

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  mockPermission.mockResolvedValue({ status: "granted" });
  mockPosition.mockResolvedValue({ coords: { longitude: 9.45, latitude: 0.4 } });
});
it("le retour à l'accueil ne remplace pas le départ choisi par le GPS", async () => {
  const origin = { position: { lon: 9.47, lat: 0.42 }, label: "Repère choisi", landmarkId: "lm-1" };
  useBookingStore.getState().setOrigin(origin);
  const { result } = renderHook(useHomePosition);
  await waitFor(() => expect(result.current.position).toEqual({ lon: 9.45, lat: 0.4 }));
  expect(useBookingStore.getState().origin).toEqual(origin);
});
it("un refus GPS laisse le départ vide pour le choix manuel", async () => {
  mockPermission.mockResolvedValue({ status: "denied" });
  const { result } = renderHook(useHomePosition);
  await act(async () => undefined);
  expect(result.current.position).toBeNull();
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

it("un premier accès demande le GPS, puis utilise le vrai point comme départ", async () => {
  mockPermission.mockResolvedValue({ status: "undetermined", canAskAgain: true });
  mockRequest.mockResolvedValue({ status: "granted", granted: true });
  const { result } = renderHook(useHomePosition);
  await waitFor(() => expect(result.current.position).toEqual({ lon: 9.45, lat: 0.4 }));
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(useBookingStore.getState().origin?.source).toBe("gps");
});

it("le bouton actualise un départ GPS et préserve un repère choisi", async () => {
  const { result } = renderHook(useHomePosition);
  await waitFor(() => expect(useBookingStore.getState().origin?.source).toBe("gps"));
  mockPosition.mockResolvedValue({ coords: { longitude: 9.46, latitude: 0.41 } });
  await act(async () => result.current.refresh());
  await waitFor(() => expect(useBookingStore.getState().origin?.position.lon).toBe(9.46));
  const chosen = { position: { lon: 9.47, lat: 0.42 }, label: "Repère", landmarkId: "repere" };
  useBookingStore.getState().setOrigin(chosen);
  mockPosition.mockResolvedValue({ coords: { longitude: 9.48, latitude: 0.43 } });
  await act(async () => result.current.refresh());
  await waitFor(() => expect(result.current.position?.lon).toBe(9.48));
  expect(useBookingStore.getState().origin).toEqual(chosen);
});
