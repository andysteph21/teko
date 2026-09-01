// D-11 → D-14b : bannière avec l'indication client, arrivée, PIN (erreur
// pin_incorrect), passager absent après le délai, fin de course espèces et
// paiement Airtel confirmé.

import { formatXaf } from "@teko/core";
import { spacing } from "@teko/ui";
import { fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";

const mockGetRide = jest.fn();
const mockMarkArrived = jest.fn();
const mockStartRide = jest.fn();
const mockCompleteRide = jest.fn();
const mockCancelRide = jest.fn();
const mockDriverBalance = jest.fn();
const mockListPaymentsForRide = jest.fn();
const mockGetPayment = jest.fn();
const mockChannel = {
  subscribeRideStatus: jest.fn(),
  subscribeRidePositions: jest.fn(),
  pushRidePosition: jest.fn(),
};

jest.mock("@teko/api-client", () => ({
  getRide: (...args: unknown[]) => mockGetRide(...args),
  markArrived: (...args: unknown[]) => mockMarkArrived(...args),
  startRide: (...args: unknown[]) => mockStartRide(...args),
  completeRide: (...args: unknown[]) => mockCompleteRide(...args),
  cancelRide: (...args: unknown[]) => mockCancelRide(...args),
  driverBalance: (...args: unknown[]) => mockDriverBalance(...args),
  listPaymentsForRide: (...args: unknown[]) => mockListPaymentsForRide(...args),
  getPayment: (...args: unknown[]) => mockGetPayment(...args),
  createRealtimePositionsChannel: () => mockChannel,
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
  useLocalSearchParams: () => ({ id: "ride-1" }),
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
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockInsets,
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

import DriverRideScreen from "../../../app/(main)/ride/[id]";
import { useWorkStore } from "./store";

const RIDE = {
  id: "ride-1",
  status: "accepted",
  client_id: "cli-1",
  driver_id: "drv-1",
  category: "eco",
  origin_geom: { type: "Point", coordinates: [9.45, 0.4] },
  dest_geom: { type: "Point", coordinates: [9.47, 0.41] },
  origin_hint: "portail bleu",
  dest_hint: null,
  price_est: 1200,
  price_final: null,
  payment_method: "cash",
  started_at: null,
  completed_at: null,
  updated_at: new Date().toISOString(),
};

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  useWorkStore.setState({ online: false, toast: null });
  mockGetRide.mockResolvedValue({ ...RIDE });
  mockChannel.subscribeRideStatus.mockImplementation(() => async () => {});
  mockChannel.subscribeRidePositions.mockImplementation(() => async () => {});
  mockChannel.pushRidePosition.mockResolvedValue(undefined);
  mockFetchRoute.mockResolvedValue({ coordinates: [], distanceM: 1200, durationS: 300 });
  mockDriverBalance.mockResolvedValue(13_520);
  mockListPaymentsForRide.mockResolvedValue([]);
});

describe("D-11 vers le passager", () => {
  it("bannière sombre avec l'indication C-09, « Je suis arrivé » → mark_arrived", async () => {
    mockMarkArrived.mockResolvedValue({
      ...RIDE,
      status: "arrived",
      updated_at: new Date().toISOString(),
    });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    expect(await screen.findByTestId("banner-hint")).toHaveTextContent("« portail bleu »");
    await user.press(screen.getByTestId("ride-arrive"));

    expect(mockMarkArrived).toHaveBeenCalledWith({}, "ride-1");
    expect(await screen.findByTestId("ride-request-pin")).toBeOnTheScreen();
  });
});

describe("D-11b attente / D-12 PIN", () => {
  it("PIN incorrect → message et on reste, puis bon PIN → course démarrée", async () => {
    mockGetRide.mockResolvedValue({
      ...RIDE,
      status: "arrived",
      updated_at: new Date().toISOString(),
    });
    const { TekoApiError } = jest.requireMock("@teko/api-client");
    mockStartRide
      .mockRejectedValueOnce(new TekoApiError("pin_incorrect", "PIN incorrect"))
      .mockResolvedValueOnce({
        ...RIDE,
        status: "started",
        started_at: new Date().toISOString(),
      });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    await user.press(await screen.findByTestId("ride-request-pin"));
    await user.type(screen.getByTestId("pin-input"), "0000");

    expect(mockStartRide).toHaveBeenCalledWith({}, "ride-1", "0000");
    expect(await screen.findByTestId("pin-error")).toBeOnTheScreen();

    // changeText direct : le démarrage démonte D-12 au 4e chiffre, un type
    // complet enverrait encore des événements au champ démonté.
    fireEvent.changeText(screen.getByTestId("pin-input"), "4729");
    expect(mockStartRide).toHaveBeenCalledWith({}, "ride-1", "4729");
    expect(await screen.findByTestId("ride-complete")).toBeOnTheScreen();
  });

  it("passager absent : disponible après le délai → cancel_ride statut no_show", async () => {
    const sixMinAgo = new Date(Date.now() - 6 * 60_000).toISOString();
    mockGetRide.mockResolvedValue({ ...RIDE, status: "arrived", updated_at: sixMinAgo });
    mockCancelRide.mockResolvedValue({ ...RIDE, status: "no_show" });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    const noShow = await screen.findByTestId("ride-noshow");
    expect(screen.getByText("Passager absent")).toBeOnTheScreen();
    await user.press(noShow);

    expect(mockCancelRide).toHaveBeenCalledWith({}, "ride-1", "passager absent", "no_show");
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(main)/home"));
  });
});

describe("inset bas edge-to-edge (régression OPPO A15, barre 3 boutons)", () => {
  // Sans réserve d'inset, le panneau colle à bottom:0 et sa dernière rangée
  // (ride-arrive / ride-noshow / ride-complete) passe sous la barre système —
  // rognée (48 px visibles sur 80, libellé 23 px, mesuré OPPO A15) jusqu'au
  // rognage total [0,0][0,0] selon la hauteur du contenu du panneau.
  it.each([
    ["accepted", "ride-arrive"],
    ["arrived", "ride-request-pin"],
    ["started", "ride-complete"],
  ])("le panneau réserve insets.bottom en %s", async (status, cta) => {
    mockInsets = { top: 28, bottom: 84, left: 0, right: 0 };
    mockGetRide.mockResolvedValue({
      ...RIDE,
      status,
      started_at: status === "started" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    render(<DriverRideScreen />);

    expect(await screen.findByTestId(cta)).toBeOnTheScreen();
    expect(screen.getByTestId("ride-panel")).toHaveStyle({ paddingBottom: 84 + spacing[5] });
  });
});

describe("D-13 course / D-14 fin", () => {
  it("pousse la position pendant la course, « Terminer » → encaissement espèces", async () => {
    mockGetRide.mockResolvedValue({
      ...RIDE,
      status: "started",
      started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    });
    mockCompleteRide.mockResolvedValue({
      ...RIDE,
      status: "completed",
      price_final: 1200,
      started_at: new Date(Date.now() - 12 * 60_000).toISOString(),
      completed_at: new Date().toISOString(),
    });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    await screen.findByTestId("ride-complete");
    await waitFor(() =>
      expect(mockChannel.pushRidePosition).toHaveBeenCalledWith("ride-1", {
        lon: 9.45,
        lat: 0.4,
      }),
    );

    await user.press(screen.getByTestId("ride-complete"));
    expect(mockCompleteRide).toHaveBeenCalledWith({}, "ride-1");
    expect(await screen.findByTestId("collect-amount")).toHaveTextContent(formatXaf(1200, "FCFA"));

    await user.press(screen.getByTestId("ride-cash-done"));
    expect(mockReplace).toHaveBeenCalledWith("/(main)/home");
  });

  it("D-14b Airtel : paiement confirmé → retour accueil", async () => {
    mockGetRide.mockResolvedValue({
      ...RIDE,
      status: "completed",
      payment_method: "airtel",
      price_final: 1200,
    });
    const payment = { id: "pay-1", kind: "ride_collection", status: "success" };
    mockListPaymentsForRide.mockResolvedValue([payment]);
    mockGetPayment.mockResolvedValue(payment);
    render(<DriverRideScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(main)/home"));
    expect(useWorkStore.getState().toast).toBe("Paiement Airtel confirmé");
  });
});
