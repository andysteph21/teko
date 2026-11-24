// C-07 Accueil (retour du 20 novembre 2026) : les options de service sont
// proposées dès l'accueil, et une destination récente mène droit au devis.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent } from "@testing-library/react-native";

const mockListMyRides = jest.fn();
jest.mock("@teko/api-client", () => ({
  listMyRides: (...args: unknown[]) => mockListMyRides(...args),
  getProfile: jest.fn(async () => ({ full_name: "Essai" })),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "u1" } }, loading: false }),
}));
jest.mock("../places/use-home-position", () => ({
  useHomePosition: () => ({ position: null, busy: false, refresh: jest.fn(), recenter: null }),
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
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(async () => ({ type: "wifi", details: {} })),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import Home from "../../../app/(main)/home";
import { useBookingStore } from "./store";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const RIDE = {
  id: "ride-1",
  status: "completed",
  created_at: new Date().toISOString(),
  dest_hint: "Marché de Mont-Bouët",
  dest_landmark_id: "lm-9",
  dest_geom: { type: "Point", coordinates: [9.4519, 0.4012] },
};

function renderHome() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Home />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  mockListMyRides.mockResolvedValue([RIDE]);
});

describe("C-07 Accueil", () => {
  it("propose Éco et Confort d'emblée, jamais Moto, et retient le choix", async () => {
    const user = userEvent.setup();
    renderHome();
    expect(screen.getByTestId("home-service-eco").props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.queryByTestId("home-service-moto")).toBeNull();
    await user.press(screen.getByTestId("home-service-confort"));
    expect(useBookingStore.getState().category).toBe("confort");
  });

  it("un récent préremplit la destination et ouvre le devis quand le départ est connu", async () => {
    useBookingStore
      .getState()
      .setOrigin({ position: { lon: 9.45, lat: 0.41 }, label: "Ma position", source: "gps" });
    const user = userEvent.setup();
    renderHome();
    await user.press(await screen.findByTestId("home-recent-ride-1"));
    expect(useBookingStore.getState().destination).toMatchObject({
      position: { lon: 9.4519, lat: 0.4012 },
      label: "Marché de Mont-Bouët",
      landmarkId: "lm-9",
    });
    expect(mockPush).toHaveBeenCalledWith("/(main)/category");
  });

  it("sans départ connu, un récent ouvre la recherche sans inventer de position", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.press(await screen.findByTestId("home-recent-ride-1"));
    expect(useBookingStore.getState().destination).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/(main)/search");
  });
});
