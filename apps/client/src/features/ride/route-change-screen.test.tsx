// R3 — écran « Modifier le trajet » : destination en vigueur préremplie,
// ajout d'un arrêt par la recherche de repères, devis (ancien / nouveau /
// différence), confirmation, attente puis issue.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";

const mockGetRide = jest.fn();
const mockQuote = jest.fn();
const mockRequest = jest.fn();
const mockLatest = jest.fn();
const mockSearch = jest.fn();
jest.mock("@teko/api-client", () => ({
  ...jest.requireActual("@teko/api-client"),
  getRide: (...args: unknown[]) => mockGetRide(...args),
  getRouteChangeQuote: (...args: unknown[]) => mockQuote(...args),
  requestRouteChange: (...args: unknown[]) => mockRequest(...args),
  latestRouteChange: (...args: unknown[]) => mockLatest(...args),
  searchLandmarksByName: (...args: unknown[]) => mockSearch(...args),
  listSavedPlaces: jest.fn(async () => []),
  listMyRides: jest.fn(async () => []),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "u1" } }, loading: false }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require("react-native").View,
}));
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ rideId: "ride-1" }),
}));

import { TekoApiError } from "@teko/api-client";
import RouteChangeScreen from "../../../app/(main)/route-change/[rideId]";
import { useBookingStore } from "../booking/store";
import { useRouteChangeSignal } from "./route-change-signal";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const RIDE = {
  id: "ride-1",
  status: "started",
  category: "eco",
  service_type: "ride",
  dest_geom: { type: "Point", coordinates: [9.47, 0.41] },
  dest_hint: "Lycée Léon Mba",
  dest_landmark_id: "lm-1",
};
const QUOTED = { id: "chg-1", status: "quoted", old_price: 1500, new_price: 2100 };
const PENDING = {
  ...QUOTED,
  status: "pending",
  requested_at: "2026-11-23T10:00:00.000Z",
  respond_by: "2026-11-23T10:00:30.000Z",
};

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RouteChangeScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useRouteChangeSignal.setState({ version: 0 });
  mockGetRide.mockResolvedValue(RIDE);
  mockQuote.mockResolvedValue(QUOTED);
  mockRequest.mockResolvedValue(PENDING);
  mockLatest.mockResolvedValue({ ...PENDING, status: "accepted" });
  mockSearch.mockResolvedValue([
    {
      id: "lm-7",
      name: "Pharmacie du Gros-Bouquet",
      geom: { type: "Point", coordinates: [9.46, 0.4] },
    },
  ]);
});

describe("R3 Modifier le trajet", () => {
  it("arrêt ajouté par la recherche, devis affiché, confirmation puis acceptation", async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(await screen.findByText("Lycée Léon Mba")).toBeOnTheScreen();
    await user.press(screen.getByTestId("route-change-add-stop"));
    await user.type(screen.getByTestId("picker-input"), "Pharma");
    await user.press(await screen.findByTestId("search-result-lm-7"));
    expect(screen.getByText("Pharmacie du Gros-Bouquet")).toBeOnTheScreen();

    await user.press(screen.getByTestId("route-change-quote"));
    expect(await screen.findByTestId("route-change-quoted")).toBeOnTheScreen();
    expect(mockQuote).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        rideId: "ride-1",
        destination: expect.objectContaining({ landmarkId: "lm-1" }),
        stops: [expect.objectContaining({ landmarkId: "lm-7", hint: "Pharmacie du Gros-Bouquet" })],
      }),
    );
    expect(screen.getByText(/1.500/)).toBeOnTheScreen();
    expect(screen.getByText(/2.100/)).toBeOnTheScreen();
    expect(screen.getByText(/\+ 600/)).toBeOnTheScreen();

    await user.press(screen.getByTestId("route-change-confirm"));
    expect(await screen.findByTestId("route-change-pending")).toBeOnTheScreen();
    expect(screen.getByTestId("route-change-countdown")).toHaveTextContent(/30 s|29 s/);
    expect(mockRequest).toHaveBeenCalledWith({}, "chg-1");

    expect(
      await screen.findByTestId("route-change-accepted", {}, { timeout: 5_000 }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Le nouveau prix est de 2.100/)).toBeOnTheScreen();
    expect(useRouteChangeSignal.getState().version).toBe(1);
    await user.press(screen.getByTestId("route-change-back"));
    expect(mockBack).toHaveBeenCalled();
  }, 20_000);

  it("refus du chauffeur : message clair, la course continue, nouvel essai possible", async () => {
    mockLatest.mockResolvedValue({ ...PENDING, status: "refused" });
    const user = userEvent.setup();
    renderScreen();
    await user.press(await screen.findByTestId("route-change-quote"));
    await user.press(await screen.findByTestId("route-change-confirm"));
    expect(
      await screen.findByTestId("route-change-refused", {}, { timeout: 5_000 }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/La course continue vers la destination prévue/)).toBeOnTheScreen();
    await user.press(screen.getByTestId("route-change-retry"));
    expect(screen.getByTestId("route-change-quote")).toBeOnTheScreen();
  }, 20_000);

  it("limite de modifications atteinte : message français du code serveur", async () => {
    mockQuote.mockRejectedValue(new TekoApiError("route_too_many_changes", "TOO_MANY_CHANGES"));
    const user = userEvent.setup();
    renderScreen();
    await user.press(await screen.findByTestId("route-change-quote"));
    await waitFor(() =>
      expect(screen.getByTestId("route-change-error")).toHaveTextContent(
        /déjà modifié ce trajet trois fois/,
      ),
    );
    await act(async () => {});
  });
});
