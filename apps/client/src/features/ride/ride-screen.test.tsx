// C-13/C-13b/C-14 : PIN affiché, bascules pilotées par le statut backend,
// completed → paiement, partage du trajet (createTripShare + Share natif).

import { spacing } from "@teko/ui";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Share } from "react-native";

const mockGetRide = jest.fn();
const mockGetProfile = jest.fn();
const mockCreateTripShare = jest.fn();
const mockChannel = {
  subscribeRideStatus: jest.fn(),
  subscribeRidePositions: jest.fn(),
};
jest.mock("@teko/api-client", () => ({
  getRide: (...args: unknown[]) => mockGetRide(...args),
  getRidePin: jest.fn(async () => "4729"),
  rideDriverCard: (...args: unknown[]) => mockGetProfile(...args),
  createTripShare: (...args: unknown[]) => mockCreateTripShare(...args),
  createRealtimePositionsChannel: () => mockChannel,
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockFetchRoute = jest.fn();
jest.mock("@teko/maps", () => ({
  ...jest.requireActual("@teko/maps"),
  fetchRoute: (...args: unknown[]) => mockFetchRoute(...args),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "ride-1" }),
}));

jest.mock("@maplibre/maplibre-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Map: ({ children }: { children?: unknown }) => React.createElement(View, null, children),
    Camera: () => null,
    GeoJSONSource: ({ children }: { children?: unknown }) =>
      React.createElement(React.Fragment, null, children),
    Layer: () => null,
  };
});
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: "denied" })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockInsets,
  SafeAreaView: require("react-native").View,
}));
jest.mock("../data/network", () => ({ fetchNetworkHint: jest.fn(async () => ({})) }));

import RideScreen from "../../../app/(main)/ride/[id]";

const RIDE = {
  id: "ride-1",
  status: "accepted",
  pin_code: "4729",
  driver_id: "drv-1",
  client_id: "cli-1",
  category: "eco",
  origin_geom: { type: "Point", coordinates: [9.45, 0.4] },
  dest_geom: { type: "Point", coordinates: [9.47, 0.41] },
  price_est: 1500,
  payment_method: "cash",
  duration_est_s: 600,
  started_at: null,
};

type StatusCb = (status: string) => void;
let statusCb: StatusCb | undefined;

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  statusCb = undefined;
  mockChannel.subscribeRideStatus.mockImplementation((_id: string, cb: StatusCb) => {
    statusCb = cb;
    return async () => {};
  });
  mockChannel.subscribeRidePositions.mockImplementation(() => async () => {});
  mockGetRide.mockResolvedValue({ ...RIDE });
  mockGetProfile.mockResolvedValue({
    firstName: "Boris",
    rating: 4.8,
    plate: "GA-482-LBV",
    category: "eco",
  });
  mockFetchRoute.mockResolvedValue({ coordinates: [], distanceM: 1200, durationS: 300 });
});

describe("C-13 approche", () => {
  it("affiche le prénom du chauffeur, le PIN et l'annulation", async () => {
    render(<RideScreen />);

    expect(await screen.findByText("Boris arrive")).toBeOnTheScreen();
    expect(screen.getByTestId("ride-pin")).toHaveTextContent("4729");

    const user = userEvent.setup();
    await user.press(screen.getByTestId("ride-cancel"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/cancel/ride-1");
  });

  it("RLS profil refusée → repli « Votre chauffeur »", async () => {
    mockGetProfile.mockRejectedValueOnce(new Error("RLS"));
    render(<RideScreen />);

    expect(await screen.findByText("Votre chauffeur arrive")).toBeOnTheScreen();
  });
});

describe("bascules pilotées par le statut backend", () => {
  it("arrived → PIN en grand (C-13b)", async () => {
    render(<RideScreen />);
    await screen.findByTestId("ride-pin");

    act(() => statusCb?.("arrived"));

    expect(await screen.findByText("Donnez ce code au chauffeur")).toBeOnTheScreen();
    expect(screen.getByTestId("arrived-banner")).toBeOnTheScreen();
  });

  it("completed → redirection paiement", async () => {
    render(<RideScreen />);
    await screen.findByTestId("ride-pin");

    act(() => statusCb?.("completed"));

    expect(mockReplace).toHaveBeenCalledWith("/(main)/payment/ride-1");
  });
});

describe("inset bas edge-to-edge (régression OPPO A15, barre 3 boutons)", () => {
  // Sans réserve d'inset, le panneau colle à bottom:0 et sa dernière ligne
  // (ride-cancel / ride-share) passe sous la barre système : peinte mais
  // intouchable (bounds accessibilité [0,0][0,0], taps → home/recents).
  it("le panneau réserve insets.bottom sur les trois états", async () => {
    mockInsets = { top: 28, bottom: 84, left: 0, right: 0 };
    render(<RideScreen />);
    await screen.findByTestId("ride-pin");
    expect(screen.getByTestId("ride-panel")).toHaveStyle({ paddingBottom: 84 + spacing[5] });
    expect(screen.getByTestId("ride-cancel")).toBeOnTheScreen();

    act(() => statusCb?.("arrived"));
    expect(await screen.findByTestId("arrived-banner")).toBeOnTheScreen();
    expect(screen.getByTestId("ride-panel")).toHaveStyle({ paddingBottom: 84 + spacing[5] });
    expect(screen.getByTestId("ride-cancel")).toBeOnTheScreen();

    act(() => statusCb?.("started"));
    expect(await screen.findByText("En course")).toBeOnTheScreen();
    expect(screen.getByTestId("ride-panel")).toHaveStyle({ paddingBottom: 84 + spacing[5] });
  });
});

describe("C-14 en course", () => {
  it("partage le trajet : createTripShare puis feuille de partage native", async () => {
    mockGetRide.mockResolvedValue({
      ...RIDE,
      status: "started",
      started_at: "2026-08-25T14:36:00Z",
    });
    mockCreateTripShare.mockResolvedValue({ token: "tok-42" });
    const shareSpy = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: "sharedAction" } as never);

    render(<RideScreen />);
    expect(await screen.findByText("En course")).toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByTestId("ride-share"));

    expect(mockCreateTripShare).toHaveBeenCalledWith({}, "ride-1");
    expect(shareSpy).toHaveBeenCalledWith({
      message: expect.stringContaining("https://teko.ga/t/tok-42"),
    });
  });
});
