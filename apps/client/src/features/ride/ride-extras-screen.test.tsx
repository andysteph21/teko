// Suivi selon le service : course (arrêts, « Modifier le trajet », prix et
// tracé de la modification acceptée), covoiturage (ordre anonyme, places),
// livraison (code de remise, partage du code, colis).

import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";

const mockGetRide = jest.fn();
const mockStops = jest.fn();
const mockLatestChange = jest.fn();
const mockShared = jest.fn();
const mockCode = jest.fn();
const mockParcel = jest.fn();
const mockCreateTripShare = jest.fn();
const mockChannel = { subscribeRideStatus: jest.fn(), subscribeRidePositions: jest.fn() };
jest.mock("@teko/api-client", () => ({
  ...jest.requireActual("@teko/api-client"),
  getRide: (...args: unknown[]) => mockGetRide(...args),
  getRidePin: jest.fn(async () => "4729"),
  rideDriverCard: jest.fn(async () => ({ firstName: "Boris" })),
  createTripShare: (...args: unknown[]) => mockCreateTripShare(...args),
  createRealtimePositionsChannel: () => mockChannel,
  latestRidePosition: jest.fn(async () => null),
  listRideStops: (...args: unknown[]) => mockStops(...args),
  acceptedRouteChange: (...args: unknown[]) => mockLatestChange(...args),
  sharedTripProgress: (...args: unknown[]) => mockShared(...args),
  deliveryCode: (...args: unknown[]) => mockCode(...args),
  getRideParcel: (...args: unknown[]) => mockParcel(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("@teko/maps", () => ({
  ...jest.requireActual("@teko/maps"),
  fetchRoute: jest.fn(async () => ({ coordinates: [], distanceM: 1200, durationS: 300 })),
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "ride-1" }),
}));
const mockRouteSource = jest.fn();
jest.mock("@maplibre/maplibre-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Map: ({ children }: { children?: unknown }) => React.createElement(View, null, children),
    Camera: () => null,
    GeoJSONSource: (props: { id: string; data: unknown; children?: unknown }) => {
      mockRouteSource(props.id, props.data);
      return React.createElement(React.Fragment, null, props.children);
    },
    Layer: () => null,
  };
});
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: "denied" })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require("react-native").View,
}));
jest.mock("../data/network", () => ({ fetchNetworkHint: jest.fn(async () => ({})) }));

import RideScreen from "../../../app/(main)/ride/[id]";
import { useRouteChangeSignal } from "./route-change-signal";
import { canEditRoute, rideKind } from "./use-ride-extras";

const RIDE = {
  id: "ride-1",
  status: "accepted",
  pin_code: "4729",
  driver_id: "drv-1",
  client_id: "cli-1",
  category: "eco",
  service_type: "ride",
  seats: 1,
  origin_geom: { type: "Point", coordinates: [9.45, 0.4] },
  dest_geom: { type: "Point", coordinates: [9.47, 0.41] },
  price_est: 1500,
  payment_method: "cash",
  duration_est_s: 600,
  started_at: null,
};
const STOP = {
  id: "stop-1",
  seq: 1,
  position: { lon: 9.46, lat: 0.405 },
  landmarkId: null,
  hint: "Pharmacie",
  arrivedAt: null,
  leftAt: null,
  waitCharged: 0,
};

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  useRouteChangeSignal.setState({ version: 0 });
  mockChannel.subscribeRideStatus.mockImplementation(() => async () => {});
  mockChannel.subscribeRidePositions.mockImplementation(() => async () => {});
  mockGetRide.mockResolvedValue({ ...RIDE });
  mockStops.mockResolvedValue([]);
  mockLatestChange.mockResolvedValue(null);
});

describe("règles pures", () => {
  it("le type de course se lit sur service_type et la catégorie", () => {
    expect(rideKind({ service_type: "ride", category: "eco" })).toBe("ride");
    expect(rideKind({ service_type: "ride", category: "covoiturage" })).toBe("shared");
    expect(rideKind({ service_type: "delivery", category: "moto" })).toBe("delivery");
  });

  it("modifiable de l'acceptation à la course commencée, jamais ailleurs", () => {
    const ride = RIDE as never;
    for (const status of ["accepted", "enroute", "arrived", "started"] as const) {
      expect(canEditRoute(ride, status)).toBe(true);
    }
    expect(canEditRoute(ride, "requested")).toBe(false);
    expect(canEditRoute(ride, "completed")).toBe(false);
    expect(canEditRoute({ ...RIDE, category: "covoiturage" } as never, "started")).toBe(false);
    expect(canEditRoute({ ...RIDE, service_type: "delivery" } as never, "started")).toBe(false);
  });
});

describe("course classique (R3)", () => {
  it("« Modifier le trajet » ouvre l'écran de modification", async () => {
    const user = userEvent.setup();
    render(<RideScreen />);
    await user.press(await screen.findByTestId("ride-edit-route"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/route-change/ride-1");
    expect(screen.queryByTestId("ride-stops")).toBeNull();
  });

  it("modification acceptée : arrêts listés, prix à jour, tracé du nouvel itinéraire", async () => {
    mockGetRide.mockResolvedValue({ ...RIDE, status: "started", price_est: 2100 });
    mockStops.mockResolvedValue([STOP, { ...STOP, id: "stop-2", seq: 2, hint: null }]);
    mockLatestChange.mockResolvedValue({
      id: "chg-1",
      status: "accepted",
      route_shape: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
      remaining_m: 4000,
      remaining_s: 700,
    });
    render(<RideScreen />);

    expect(await screen.findByTestId("ride-stop-1")).toHaveTextContent("1. Pharmacie");
    expect(screen.getByTestId("ride-stop-2")).toHaveTextContent("2. Arrêt 2");
    expect(screen.getByTestId("ride-changed-price")).toHaveTextContent(/nouveau prix 2.100/);
    await waitFor(() => {
      const route = mockRouteSource.mock.calls.filter(([id]) => id === "rn-ride-route").at(-1);
      expect(JSON.stringify(route?.[1])).toContain("[-12.02,3.85]");
    });
    expect(mockRouteSource.mock.calls.some(([id]) => id === "rn-ride-stops")).toBe(true);
  });

  it("une modification acceptée ailleurs recharge la course et ses compléments", async () => {
    render(<RideScreen />);
    await screen.findByTestId("ride-edit-route");
    expect(mockGetRide).toHaveBeenCalledTimes(1);
    mockStops.mockResolvedValue([STOP]);
    act(() => useRouteChangeSignal.getState().bump());
    expect(await screen.findByTestId("ride-stop-1")).toBeOnTheScreen();
    expect(mockGetRide).toHaveBeenCalledTimes(2);
  });
});

describe("covoiturage (R4)", () => {
  it("ordre indicatif anonyme, places occupées, pas de modification du trajet", async () => {
    mockGetRide.mockResolvedValue({ ...RIDE, category: "covoiturage", seats: 2 });
    mockShared.mockResolvedValue({
      seatsTaken: 3,
      seatsTotal: 3,
      stops: [
        { kind: "pickup", mine: false, done: true },
        { kind: "pickup", mine: true, done: false },
        { kind: "dropoff", mine: false, done: false },
        { kind: "dropoff", mine: true, done: false },
      ],
    });
    render(<RideScreen />);

    expect(await screen.findByTestId("shared-seats-taken")).toHaveTextContent(/3 .* sur 3/);
    expect(screen.getByTestId("shared-stop-0")).toHaveTextContent(
      "1. Montée d’un autre passager · fait",
    );
    expect(screen.getByTestId("shared-stop-1")).toHaveTextContent("2. Votre prise en charge");
    expect(screen.getByTestId("shared-stop-3")).toHaveTextContent("4. Votre arrivée");
    expect(screen.queryByTestId("ride-edit-route")).toBeNull();
    expect(mockStops).not.toHaveBeenCalled();
  });
});

describe("livraison (R5)", () => {
  it("code de remise visible, partagé avec le lien de suivi, colis rappelé", async () => {
    mockGetRide.mockResolvedValue({ ...RIDE, service_type: "delivery", category: "moto" });
    mockCode.mockResolvedValue("8341");
    mockParcel.mockResolvedValue({
      ride_id: "ride-1",
      description: "Documents scellés",
      size: "small",
      recipient_name: "Awa",
      recipient_phone: "24177123456",
    });
    mockCreateTripShare.mockResolvedValue({ token: "tok-42" });
    const shareSpy = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: "sharedAction" } as never);
    const user = userEvent.setup();
    render(<RideScreen />);

    expect(await screen.findByText("8341")).toBeOnTheScreen();
    expect(screen.getByText(/Donnez ce code au destinataire/)).toBeOnTheScreen();
    expect(screen.getByTestId("delivery-parcel")).toHaveTextContent(/Petit colis · Pour Awa/);
    expect(screen.getByText("Documents scellés")).toBeOnTheScreen();
    expect(screen.getByTestId("ride-pin")).toHaveTextContent("4729");
    expect(screen.queryByTestId("ride-edit-route")).toBeNull();

    await user.press(screen.getByTestId("delivery-share"));
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    const message = shareSpy.mock.calls[0]?.[0] as { message: string };
    expect(message.message).toContain("8341");
    expect(message.message).toContain("https://teko.ga/t/tok-42");
  });

  it("code indisponible : repli discret, partage désactivé", async () => {
    mockGetRide.mockResolvedValue({ ...RIDE, service_type: "delivery" });
    mockCode.mockRejectedValue(new Error("réseau"));
    mockParcel.mockResolvedValue(null);
    render(<RideScreen />);
    expect(await screen.findByTestId("delivery-code")).toHaveTextContent("····");
    expect(screen.getByTestId("delivery-share")).toBeDisabled();
  });
});
