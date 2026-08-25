// D-09 : solde du jour + toggle hors ligne/en ligne (heartbeat), modal
// d'offre D-10 (accepter → navigation course), état suspendu.

import { formatXaf } from "@teko/core";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";

const mockHeartbeat = jest.fn();
const mockGetMyDriver = jest.fn();
const mockDriverBalance = jest.fn();
const mockListPendingOffers = jest.fn();
const mockOfferDetails = jest.fn();
const mockRespondOffer = jest.fn();
const mockSubscribeNotifications = jest.fn();
jest.mock("@teko/api-client", () => ({
  driverHeartbeat: (...args: unknown[]) => mockHeartbeat(...args),
  getMyDriver: (...args: unknown[]) => mockGetMyDriver(...args),
  driverBalance: (...args: unknown[]) => mockDriverBalance(...args),
  listPendingOffers: (...args: unknown[]) => mockListPendingOffers(...args),
  offerDetails: (...args: unknown[]) => mockOfferDetails(...args),
  respondOffer: (...args: unknown[]) => mockRespondOffer(...args),
  subscribeNotifications: (...args: unknown[]) => mockSubscribeNotifications(...args),
  TekoApiError: class TekoApiError extends Error {
    code: string;
    constructor(code = "unknown", message = "") {
      super(message);
      this.code = code;
    }
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "drv-1" } }, loading: false }),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    require("react").useEffect(cb, [cb]);
  },
}));

const mockFetchRoute = jest.fn();
jest.mock("@teko/maps", () => ({
  ...jest.requireActual("@teko/maps"),
  fetchRoute: (...args: unknown[]) => mockFetchRoute(...args),
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
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { longitude: 9.45, latitude: 0.4 },
  })),
  Accuracy: { Balanced: 3 },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require("react-native").View,
}));
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: jest.fn(async () => ({ type: "wifi", details: {} })) },
}));
jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Mock = (props: { children?: unknown }) => React.createElement(View, null, props.children);
  return { __esModule: true, default: Mock, Svg: Mock, Path: Mock, Circle: Mock, Rect: Mock };
});

import DriverHome from "../../../app/(main)/home";
import { useWorkStore } from "./store";

const OFFER = {
  offerId: "off-1",
  status: "pending",
  expiresAt: new Date(Date.now() + 12_000).toISOString(),
  category: "eco",
  origin: { lon: 9.45, lat: 0.4 },
  originLandmark: "Marché du Mont-Bouët",
  originHint: "portail bleu",
  meetingLandmark: null,
  distanceEstM: 3200,
  durationEstS: 720,
  priceEst: 1200,
  commission: 180,
  netDriver: 1020,
  paymentMethod: "cash",
};

type NotifCb = (n: { type: string; payload: unknown }) => void;
let notifCb: NotifCb | undefined;

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  notifCb = undefined;
  useWorkStore.setState({ online: false, toast: null });
  mockHeartbeat.mockResolvedValue(undefined);
  mockGetMyDriver.mockResolvedValue({ id: "drv-1", is_active: true, kyc_status: "validated" });
  mockDriverBalance.mockResolvedValue(12_500);
  mockListPendingOffers.mockResolvedValue([]);
  mockSubscribeNotifications.mockImplementation((_c: unknown, _u: string, cb: NotifCb) => {
    notifCb = cb;
    return async () => {};
  });
  mockOfferDetails.mockResolvedValue({ ...OFFER });
  mockFetchRoute.mockResolvedValue({ coordinates: [], distanceM: 1200, durationS: 240 });
});

describe("D-09 Accueil", () => {
  it("affiche le solde du jour et l'état hors ligne", async () => {
    render(<DriverHome />);

    expect(await screen.findByText(`+${formatXaf(12_500)}`)).toBeOnTheScreen();
    expect(screen.getByText("Hors ligne")).toBeOnTheScreen();
    expect(mockHeartbeat).not.toHaveBeenCalled();
  });

  it("toggle en ligne → heartbeat immédiat avec la position GPS", async () => {
    const user = userEvent.setup();
    render(<DriverHome />);
    await screen.findByTestId("online-toggle");

    await user.press(screen.getByTestId("online-toggle"));

    expect(screen.getByText("En ligne")).toBeOnTheScreen();
    await waitFor(() =>
      expect(mockHeartbeat).toHaveBeenCalledWith({}, { lon: 9.45, lat: 0.4 }, { eco: false }),
    );
  });

  it("suspendu : bandeau explicite, toggle inopérant", async () => {
    mockGetMyDriver.mockResolvedValue({ id: "drv-1", is_active: false, kyc_status: "validated" });
    const user = userEvent.setup();
    render(<DriverHome />);

    expect(await screen.findByTestId("suspended-banner")).toBeOnTheScreen();
    await user.press(screen.getByTestId("online-toggle"));
    expect(screen.getByText("Hors ligne")).toBeOnTheScreen();
    expect(mockHeartbeat).not.toHaveBeenCalled();
  });
});

describe("D-10 Demande de course", () => {
  it("notification ride_offer → modal avec le net en grand, accepter → course", async () => {
    mockRespondOffer.mockResolvedValue({ id: "ride-9", status: "accepted" });
    const user = userEvent.setup();
    render(<DriverHome />);
    await screen.findByTestId("online-toggle");
    await user.press(screen.getByTestId("online-toggle"));
    await waitFor(() => expect(mockSubscribeNotifications).toHaveBeenCalled());

    act(() => notifCb?.({ type: "ride_offer", payload: { offer_id: "off-1" } }));

    expect(await screen.findByTestId("offer-modal")).toBeOnTheScreen();
    expect(screen.getByTestId("offer-net")).toHaveTextContent(formatXaf(1020));
    expect(screen.queryByText("Pharmacie de Nkembo")).toBeNull();

    await user.press(screen.getByTestId("offer-accept"));
    expect(mockRespondOffer).toHaveBeenCalledWith({}, "off-1", true);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(main)/ride/ride-9"));
  });

  it("offre déjà attribuée (offer_already_handled) → toast discret, retour attente", async () => {
    const { TekoApiError } = require("@teko/api-client");
    mockRespondOffer.mockRejectedValue(
      new TekoApiError("offer_already_handled", "Offre déjà traitée"),
    );
    const user = userEvent.setup();
    render(<DriverHome />);
    await screen.findByTestId("online-toggle");
    await user.press(screen.getByTestId("online-toggle"));
    await waitFor(() => expect(mockSubscribeNotifications).toHaveBeenCalled());

    act(() => notifCb?.({ type: "ride_offer", payload: { offer_id: "off-1" } }));
    await screen.findByTestId("offer-modal");
    await user.press(screen.getByTestId("offer-accept"));

    expect(screen.queryByTestId("offer-modal")).toBeNull();
    expect(await screen.findByTestId("work-toast")).toHaveTextContent(
      "Demande attribuée à un autre chauffeur",
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
