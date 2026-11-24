const mockProcessLocation = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock("../../lib/location-task", () => ({
  processDriverLocation: (...args: unknown[]) => mockProcessLocation(...args),
}));
jest.mock("../../lib/location-service", () => ({
  configureDriverLocation: jest.fn(async () => undefined),
}));

// Écran de course selon sa nature : modification de trajet et arrêts (lot
// R3), covoiturage à plusieurs courses actives (lot R4), livraison remise par
// photo et code (lot R5).

import { formatXaf } from "@teko/core";
import { fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Keyboard } from "react-native";

const mockApi = {
  getRide: jest.fn(),
  markArrived: jest.fn(),
  startRide: jest.fn(),
  completeRide: jest.fn(),
  cancelRide: jest.fn(),
  driverBalance: jest.fn(),
  listMyRides: jest.fn(),
  acceptedRouteChange: jest.fn(async () => null),
  latestRouteChange: jest.fn(),
  respondRouteChange: jest.fn(),
  routeChangeRoute: jest.fn(),
  listRideStops: jest.fn(),
  arriveStop: jest.fn(),
  leaveStop: jest.fn(),
  landmarkNames: jest.fn(),
  rideClientPosition: jest.fn(),
  listPendingOffers: jest.fn(),
  offerDetails: jest.fn(),
  respondOffer: jest.fn(),
  subscribeNotifications: jest.fn(),
  getRideParcel: jest.fn(),
  uploadDeliveryProof: jest.fn(),
  completeDelivery: jest.fn(),
};
const mockChannel = {
  subscribeRideStatus: jest.fn(),
  subscribeRidePositions: jest.fn(),
  pushRidePosition: jest.fn(),
};

jest.mock("@teko/api-client", () => {
  const api: Record<string, unknown> = {
    createRealtimePositionsChannel: () => mockChannel,
    listPaymentsForRide: jest.fn(async () => []),
    getPayment: jest.fn(),
    TekoApiError: class TekoApiError extends Error {
      code: string;
      constructor(code = "unknown", message = "") {
        super(message);
        this.code = code;
      }
    },
  };
  // La fabrique s'exécute avant l'initialisation de mockApi : noms en clair,
  // résolution paresseuse à l'appel.
  const names = [
    "getRide",
    "markArrived",
    "startRide",
    "completeRide",
    "cancelRide",
    "driverBalance",
    "listMyRides",
    "latestRouteChange",
    "respondRouteChange",
    "routeChangeRoute",
    "listRideStops",
    "arriveStop",
    "leaveStop",
    "landmarkNames",
    "rideClientPosition",
    "listPendingOffers",
    "offerDetails",
    "respondOffer",
    "subscribeNotifications",
    "getRideParcel",
    "uploadDeliveryProof",
    "completeDelivery",
  ];
  for (const name of names) {
    api[name] = (...args: unknown[]) => mockApi[name as keyof typeof mockApi](...args);
  }
  return api;
});
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "drv-1" } }, loading: false }),
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "ride-1" }),
  useFocusEffect: (cb: () => void) => {
    require("react").useEffect(cb, [cb]);
  },
}));
jest.mock("@teko/maps", () => ({
  ...jest.requireActual("@teko/maps"),
  fetchRoute: jest.fn(async () => ({ coordinates: [], distanceM: 1200, durationS: 300 })),
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
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { longitude: 9.45, latitude: 0.4 } })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
  Accuracy: { Balanced: 3, High: 4 },
}));
const mockCameraPermission = jest.fn();
const mockLaunchCamera = jest.fn();
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: (...args: unknown[]) => mockCameraPermission(...args),
  launchCameraAsync: (...args: unknown[]) => mockLaunchCamera(...args),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
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
import { configureDriverLocation } from "../../lib/location-service";
import { useWorkStore } from "./store";

const RIDE = {
  id: "ride-1",
  status: "started",
  client_id: "cli-1",
  driver_id: "drv-1",
  category: "eco",
  service_type: "ride",
  shared_trip_id: null,
  seats: 1,
  origin_geom: { type: "Point", coordinates: [9.45, 0.4] },
  dest_geom: { type: "Point", coordinates: [9.47, 0.41] },
  origin_hint: "portail bleu",
  dest_hint: null,
  price_est: 1200,
  price_final: null,
  payment_method: "cash",
  created_at: "2026-11-23T10:00:00Z",
  accepted_at: "2026-11-23T10:01:00Z",
  started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  completed_at: null,
  updated_at: new Date().toISOString(),
};
const CHANGE = {
  id: "chg-1",
  ride_id: "ride-1",
  status: "pending",
  respond_by: new Date(Date.now() + 30_000).toISOString(),
  expires_at: new Date(Date.now() + 300_000).toISOString(),
  dest_hint: "portail vert",
  dest_landmark_id: "lm-9",
  stops: [{ lon: 9.46, lat: 0.41 }],
  old_price: 1200,
  new_price: 1800,
  route_shape: "x",
  remaining_m: 9000,
  remaining_s: 1800,
};
const stop = (seq: number, patch: object = {}) => ({
  id: `stop-${seq}`,
  seq,
  position: { lon: 9.46, lat: 0.41 },
  landmarkId: null,
  hint: seq === 2 ? "pharmacie" : null,
  arrivedAt: null,
  leftAt: null,
  waitCharged: 0,
  ...patch,
});

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
  useWorkStore.setState({ online: true, toast: null });
  mockApi.getRide.mockResolvedValue({ ...RIDE });
  mockApi.driverBalance.mockResolvedValue(13_520);
  mockApi.listMyRides.mockResolvedValue([]);
  mockApi.latestRouteChange.mockResolvedValue(null);
  mockApi.routeChangeRoute.mockReturnValue({
    coordinates: [
      { lon: 9.45, lat: 0.4 },
      { lon: 9.48, lat: 0.42 },
    ],
  });
  mockApi.listRideStops.mockResolvedValue([]);
  mockApi.landmarkNames.mockResolvedValue({});
  mockApi.rideClientPosition.mockResolvedValue(null);
  mockApi.listPendingOffers.mockResolvedValue([]);
  mockApi.subscribeNotifications.mockReturnValue(async () => {});
  mockApi.getRideParcel.mockResolvedValue(null);
  mockChannel.subscribeRideStatus.mockImplementation(() => async () => {});
  mockChannel.subscribeRidePositions.mockImplementation(() => async () => {});
  mockCameraPermission.mockResolvedValue({ granted: true });
  mockLaunchCamera.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///colis.jpg" }] });
  globalThis.fetch = jest.fn(async () => ({
    arrayBuffer: async () => new ArrayBuffer(4),
  })) as unknown as typeof fetch;
});

describe("lot R3 — modification de trajet", () => {
  it("demande en attente : fenêtre, annonce, Accepter → course et arrêts relus", async () => {
    mockApi.latestRouteChange.mockResolvedValue({ ...CHANGE });
    mockApi.landmarkNames.mockResolvedValue({ "lm-9": "Marché de Nkembo" });
    mockApi.respondRouteChange.mockResolvedValue({ ...CHANGE, status: "accepted" });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    expect(await screen.findByTestId("route-change-modal")).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByTestId("route-change-destination")).toHaveTextContent("Marché de Nkembo"),
    );
    expect(screen.getByTestId("route-change-stops")).toHaveTextContent("1 arrêt en chemin");
    expect(screen.getByTestId("route-change-old-price")).toHaveTextContent(formatXaf(1200, "FCFA"));
    expect(screen.getByTestId("route-change-new-price")).toHaveTextContent(formatXaf(1800, "FCFA"));
    const Speech = require("expo-speech");
    await waitFor(() =>
      expect(Speech.speak).toHaveBeenCalledWith(
        expect.stringContaining("modification du trajet"),
        expect.anything(),
      ),
    );

    mockApi.getRide.mockResolvedValue({ ...RIDE, price_est: 1800, dest_hint: "portail vert" });
    mockApi.listRideStops.mockResolvedValue([stop(1)]);
    await user.press(screen.getByTestId("route-change-accept"));

    expect(mockApi.respondRouteChange).toHaveBeenCalledWith({}, "chg-1", true);
    await waitFor(() => expect(screen.queryByTestId("route-change-modal")).toBeNull());
    expect(await screen.findByTestId("ride-stops")).toBeOnTheScreen();
    expect(await screen.findByTestId("banner-hint")).toHaveTextContent("« portail vert »");
    expect(screen.getByText(formatXaf(1800, "FCFA"), { exact: false })).toBeOnTheScreen();
    expect(useWorkStore.getState().toast).toBe("Trajet modifié : destination et prix mis à jour");
  });

  it("Refuser : réponse envoyée, fenêtre fermée, course inchangée", async () => {
    mockApi.latestRouteChange.mockResolvedValue({ ...CHANGE });
    mockApi.respondRouteChange.mockResolvedValue({ ...CHANGE, status: "refused" });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    await user.press(await screen.findByTestId("route-change-refuse"));

    expect(mockApi.respondRouteChange).toHaveBeenCalledWith({}, "chg-1", false);
    await waitFor(() => expect(screen.queryByTestId("route-change-modal")).toBeNull());
    expect(mockApi.getRide).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("ride-stops")).toBeNull();
  });

  it("demande déjà close côté serveur : message par code, fenêtre fermée", async () => {
    const { TekoApiError } = jest.requireMock("@teko/api-client");
    mockApi.latestRouteChange.mockResolvedValue({ ...CHANGE });
    mockApi.respondRouteChange.mockRejectedValue(new TekoApiError("route_change_handled"));
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    await user.press(await screen.findByTestId("route-change-accept"));

    await waitFor(() => expect(screen.queryByTestId("route-change-modal")).toBeNull());
    expect(useWorkStore.getState().toast).toBe("Cette demande n'est plus en attente");
  });

  it("une demande expirée ou déjà traitée n'ouvre pas la fenêtre", async () => {
    mockApi.latestRouteChange.mockResolvedValue({
      ...CHANGE,
      respond_by: new Date(Date.now() - 1000).toISOString(),
    });
    render(<DriverRideScreen />);

    await screen.findByTestId("ride-complete");
    await waitFor(() => expect(mockApi.latestRouteChange).toHaveBeenCalledWith({}, "ride-1"));
    expect(screen.queryByTestId("route-change-modal")).toBeNull();
  });

  it("arrêts dans l'ordre : arrivé (fin de course bloquée) puis repartir (attente facturée)", async () => {
    mockApi.listRideStops.mockResolvedValue([stop(1), stop(2)]);
    mockApi.arriveStop.mockResolvedValue(stop(1, { arrivedAt: new Date().toISOString() }));
    mockApi.leaveStop.mockResolvedValue(
      stop(1, {
        arrivedAt: "2026-11-23T10:10:00Z",
        leftAt: "2026-11-23T10:16:00Z",
        waitCharged: 75,
      }),
    );
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    expect(await screen.findByText("Arrivé à l'arrêt 1")).toBeOnTheScreen();
    expect(screen.getByText("Arrêt 2 · « pharmacie »")).toBeOnTheScreen();
    expect(screen.queryByTestId("complete-blocked")).toBeNull();
    await user.press(screen.getByTestId("stop-arrive"));

    expect(mockApi.arriveStop).toHaveBeenCalledWith({}, "stop-1");
    expect(await screen.findByTestId("complete-blocked")).toBeOnTheScreen();
    expect(screen.getByTestId("stop-wait")).toHaveTextContent(/gratuit encore/);
    await user.press(screen.getByTestId("ride-complete"));
    expect(mockApi.completeRide).not.toHaveBeenCalled();

    mockApi.getRide.mockResolvedValue({ ...RIDE, price_est: 1275 });
    await user.press(screen.getByTestId("stop-leave"));

    expect(mockApi.leaveStop).toHaveBeenCalledWith({}, "stop-1");
    expect(await screen.findByTestId("stop-done-1")).toHaveTextContent(
      `Fait · attente facturée ${formatXaf(75, "FCFA")}`,
    );
    expect(screen.queryByTestId("complete-blocked")).toBeNull();
    expect(await screen.findByText("Arrivé à l'arrêt 2")).toBeOnTheScreen();
    expect(await screen.findByText(formatXaf(1275, "FCFA"), { exact: false })).toBeOnTheScreen();
  });

  it("covoiturage et livraison : aucune lecture de modification", async () => {
    mockApi.getRide.mockResolvedValue({ ...RIDE, category: "covoiturage", shared_trip_id: "t1" });
    render(<DriverRideScreen />);
    await screen.findByTestId("ride-complete");
    expect(mockApi.latestRouteChange).not.toHaveBeenCalled();
    expect(mockApi.listRideStops).not.toHaveBeenCalled();
  });
});

const SHARED = { ...RIDE, category: "covoiturage", shared_trip_id: "trip-1", seats: 2 };
const SECOND = {
  ...SHARED,
  id: "ride-2",
  status: "accepted",
  seats: 1,
  price_est: 775,
  accepted_at: "2026-11-23T10:05:00Z",
  started_at: null,
};
const OFFER = {
  offerId: "off-9",
  status: "pending",
  expiresAt: new Date(Date.now() + 12_000).toISOString(),
  category: "covoiturage",
  origin: { lon: 9.455, lat: 0.4005 },
  originLandmark: "Carrefour Rio",
  originHint: null,
  meetingLandmark: null,
  distanceEstM: 3000,
  durationEstS: 600,
  priceEst: 775,
  commission: 116,
  netDriver: 659,
  paymentMethod: "cash",
  seats: 1,
  sharedSeatsTaken: 2,
  serviceType: "ride",
  parcelSize: null,
};

describe("lot R4 — covoiturage à la place", () => {
  it("liste les passagers à bord ou attendus, leur action suivante et la règle du service", async () => {
    mockApi.getRide.mockResolvedValue({ ...SHARED });
    mockApi.listMyRides.mockResolvedValue([
      { ...SECOND },
      { ...SHARED },
      { ...SHARED, id: "ride-0", status: "completed", accepted_at: "2026-11-23T09:00:00Z" },
    ]);
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    expect(await screen.findByTestId("shared-pax-ride-2")).toBeOnTheScreen();
    expect(screen.getByTestId("shared-seats")).toHaveTextContent("Covoiturage · 3 / 3 places");
    expect(screen.getByTestId("shared-pax-ride-1")).toHaveTextContent(/Passager 2 · 2 places/);
    expect(screen.getByTestId("shared-pax-ride-1")).toHaveTextContent(
      `À bord · à déposer, encaisser ${formatXaf(1200, "FCFA")}`,
      { exact: false },
    );
    expect(screen.getByTestId("shared-pax-ride-2")).toHaveTextContent(/Passager 3 · 1 place/);
    expect(screen.getByTestId("shared-pax-ride-2")).toHaveTextContent(/À prendre/);
    expect(screen.queryByTestId("shared-pax-ride-0")).toBeNull();
    expect(screen.getByTestId("shared-rule")).toHaveTextContent(
      "Aucune prise en charge hors application pendant un covoiturage.",
    );

    await user.press(screen.getByTestId("shared-pax-ride-2"));
    expect(mockReplace).toHaveBeenCalledWith("/(main)/ride/ride-2");
  });

  it("offre d'un passager supplémentaire pendant le trajet : places prises, accepter → sa course", async () => {
    mockApi.getRide.mockResolvedValue({ ...SHARED });
    mockApi.listMyRides.mockResolvedValue([{ ...SHARED }]);
    mockApi.listPendingOffers.mockResolvedValue([
      { id: "off-9", expires_at: new Date(Date.now() + 12_000).toISOString() },
    ]);
    mockApi.offerDetails.mockResolvedValue({ ...OFFER });
    mockApi.respondOffer.mockResolvedValue({ ...SECOND });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    expect(await screen.findByTestId("offer-modal")).toBeOnTheScreen();
    expect(screen.getByTestId("offer-service")).toHaveTextContent(/Covoiturage/);
    expect(screen.getByTestId("offer-service")).toHaveTextContent(/1 place demandée/);
    expect(screen.getByTestId("offer-service")).toHaveTextContent(/2 places déjà prises sur 3/);

    await user.press(screen.getByTestId("offer-accept"));
    expect(mockApi.respondOffer).toHaveBeenCalledWith({}, "off-9", true);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(main)/ride/ride-2"));
  });

  it("places prises entre-temps : message dédié (code seats_full)", async () => {
    const { TekoApiError } = jest.requireMock("@teko/api-client");
    mockApi.getRide.mockResolvedValue({ ...SHARED });
    mockApi.listPendingOffers.mockResolvedValue([
      { id: "off-9", expires_at: new Date(Date.now() + 12_000).toISOString() },
    ]);
    mockApi.offerDetails.mockResolvedValue({ ...OFFER });
    mockApi.respondOffer.mockRejectedValue(new TekoApiError("seats_full"));
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    await user.press(await screen.findByTestId("offer-accept"));
    await waitFor(() =>
      expect(useWorkStore.getState().toast).toBe("Plus assez de places dans le véhicule"),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("course classique : aucune offre lue pendant la course", async () => {
    render(<DriverRideScreen />);
    await screen.findByTestId("ride-complete");
    expect(mockApi.listPendingOffers).not.toHaveBeenCalled();
    expect(mockApi.subscribeNotifications).not.toHaveBeenCalled();
    expect(screen.queryByTestId("shared-passengers")).toBeNull();
  });

  it("terminer encaisse le montant de CETTE course, puis passe au passager suivant", async () => {
    mockApi.getRide.mockResolvedValue({ ...SHARED });
    mockApi.listMyRides.mockResolvedValue([{ ...SHARED }, { ...SECOND }]);
    mockApi.completeRide.mockResolvedValue({
      ...SHARED,
      status: "completed",
      price_final: 1200,
      completed_at: new Date().toISOString(),
    });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    await screen.findByTestId("shared-pax-ride-2");
    await user.press(screen.getByTestId("ride-complete"));
    expect(mockApi.completeRide).toHaveBeenCalledWith({}, "ride-1");
    expect(await screen.findByTestId("collect-amount")).toHaveTextContent(formatXaf(1200, "FCFA"));
    // Le suivi GPS continue pour le passager encore attendu.
    await waitFor(() =>
      expect(configureDriverLocation).toHaveBeenLastCalledWith({
        userId: "drv-1",
        rideId: "ride-2",
        eco: false,
      }),
    );

    await user.press(screen.getByTestId("ride-cash-done"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(main)/ride/ride-2"));
    expect(mockReplace).not.toHaveBeenCalledWith("/(main)/home");
  });

  it("dernier passager déposé : retour à l'accueil", async () => {
    mockApi.getRide.mockResolvedValue({ ...SHARED, status: "completed", price_final: 1200 });
    mockApi.listMyRides.mockResolvedValue([{ ...SHARED, status: "completed" }]);
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    await user.press(await screen.findByTestId("ride-cash-done"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(main)/home"));
  });
});

const DELIVERY = { ...RIDE, service_type: "delivery", price_est: 1150 };
const PARCEL = {
  ride_id: "ride-1",
  description: "Enveloppe de documents",
  size: "small",
  recipient_name: "Awa",
  recipient_phone: "24107112233",
};

async function openHandoff(user: ReturnType<typeof userEvent.setup>) {
  render(<DriverRideScreen />);
  await user.press(await screen.findByTestId("delivery-handoff"));
  await user.press(screen.getByTestId("delivery-photo"));
  await screen.findByTestId("delivery-photo-done");
}

describe("lot R5 — livraison", () => {
  beforeEach(() => {
    mockApi.getRide.mockResolvedValue({ ...DELIVERY });
    mockApi.getRideParcel.mockResolvedValue({ ...PARCEL });
    mockApi.uploadDeliveryProof.mockResolvedValue("ride-1/remise-1.jpg");
  });

  it("approche : colis, rappel d'encaisser l'expéditeur, jamais le destinataire", async () => {
    mockApi.getRide.mockResolvedValue({ ...DELIVERY, status: "accepted", started_at: null });
    render(<DriverRideScreen />);

    expect(await screen.findByTestId("delivery-cash-reminder")).toHaveTextContent(
      `Encaissez ${formatXaf(1150, "FCFA")} en espèces`,
      { exact: false },
    );
    expect(await screen.findByTestId("parcel-details")).toHaveTextContent(/Colis petit/);
    expect(screen.getByText("Expéditeur")).toBeOnTheScreen();
    expect(screen.queryByText("Awa")).toBeNull();
    expect(screen.getByTestId("ride-panel")).toHaveStyle({ paddingBottom: 34 + 20 });
  });

  it("en route : destinataire lisible, remise par photo puis code", async () => {
    mockApi.completeDelivery.mockResolvedValue({
      ok: true,
      ride: { ...DELIVERY, status: "completed", price_final: 1150 },
    });
    const user = userEvent.setup();
    render(<DriverRideScreen />);

    expect(await screen.findByTestId("delivery-recipient")).toHaveTextContent(/Awa/);
    expect(screen.getByTestId("delivery-recipient")).toHaveTextContent(/\+24107112233/);
    expect(screen.queryByTestId("ride-complete")).toBeNull();
    await user.press(screen.getByTestId("delivery-handoff"));

    // Le code ne se saisit qu'après la photo.
    expect(screen.queryByTestId("delivery-code-input")).toBeNull();
    await user.press(screen.getByTestId("delivery-photo"));
    expect(await screen.findByTestId("delivery-photo-done")).toBeOnTheScreen();
    expect(mockLaunchCamera).toHaveBeenCalledWith({ mediaTypes: ["images"], quality: 0.6 });
    expect(mockApi.uploadDeliveryProof).toHaveBeenCalledWith({}, "ride-1", expect.any(ArrayBuffer));

    fireEvent.changeText(screen.getByTestId("delivery-code-input"), "4729");
    expect(mockApi.completeDelivery).toHaveBeenCalledWith(
      {},
      { rideId: "ride-1", code: "4729", photoPath: "ride-1/remise-1.jpg" },
    );
    expect(await screen.findByTestId("delivery-amount")).toHaveTextContent(formatXaf(1150, "FCFA"));
    expect(mockApi.completeRide).not.toHaveBeenCalled();
    expect(screen.queryByTestId("collect-amount")).toBeNull();

    await user.press(screen.getByTestId("delivery-done"));
    expect(mockReplace).toHaveBeenCalledWith("/(main)/home");
  });

  it("code incorrect : essais restants ; cinquième échec : saisie bloquée", async () => {
    mockApi.completeDelivery
      .mockResolvedValueOnce({
        ok: false,
        error: "code_incorrect",
        attemptsRemaining: 1,
        retryAfterS: 0,
      })
      .mockResolvedValueOnce({
        ok: false,
        error: "code_blocked",
        attemptsRemaining: 0,
        retryAfterS: 300,
      });
    const user = userEvent.setup();
    await openHandoff(user);

    fireEvent.changeText(screen.getByTestId("delivery-code-input"), "0000");
    expect(await screen.findByTestId("delivery-error")).toHaveTextContent(
      "Code incorrect. Il reste 1 essai.",
    );

    fireEvent.changeText(screen.getByTestId("delivery-code-input"), "1111");
    expect(await screen.findByTestId("delivery-blocked")).toHaveTextContent(
      "Trop d'essais. Réessayez dans 5:00.",
    );
    expect(screen.queryByTestId("delivery-code-input")).toBeNull();
  });

  it("photo refusée par le serveur (delivery_proof_required) : à reprendre", async () => {
    const { TekoApiError } = jest.requireMock("@teko/api-client");
    mockApi.completeDelivery.mockRejectedValue(new TekoApiError("delivery_proof_required"));
    const user = userEvent.setup();
    await openHandoff(user);

    fireEvent.changeText(screen.getByTestId("delivery-code-input"), "4729");
    expect(await screen.findByTestId("delivery-error")).toHaveTextContent(
      "Photo de remise requise. Reprenez la photo du colis.",
    );
    expect(screen.queryByTestId("delivery-photo-done")).toBeNull();
    expect(screen.queryByTestId("delivery-code-input")).toBeNull();
  });

  it("appareil photo refusé ou prise abandonnée : rien n'est envoyé", async () => {
    mockCameraPermission.mockResolvedValueOnce({ granted: false });
    const user = userEvent.setup();
    render(<DriverRideScreen />);
    await user.press(await screen.findByTestId("delivery-handoff"));

    await user.press(screen.getByTestId("delivery-photo"));
    expect(await screen.findByTestId("delivery-error")).toHaveTextContent(
      /Autorisez l'appareil photo/,
    );
    mockLaunchCamera.mockResolvedValueOnce({ canceled: true, assets: [] });
    await user.press(screen.getByTestId("delivery-photo"));
    await waitFor(() => expect(mockLaunchCamera).toHaveBeenCalledTimes(1));
    expect(mockApi.uploadDeliveryProof).not.toHaveBeenCalled();
    expect(screen.queryByTestId("delivery-photo-done")).toBeNull();
  });

  it("annonces vocales adaptées à la livraison", async () => {
    const Speech = require("expo-speech");
    mockApi.getRide.mockResolvedValue({ ...DELIVERY, status: "accepted", started_at: null });
    render(<DriverRideScreen />);
    await waitFor(() =>
      expect(Speech.speak).toHaveBeenCalledWith(
        "Livraison acceptée. L'expéditeur vous attend : portail bleu.",
        expect.anything(),
      ),
    );
  });
});
