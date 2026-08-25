// C-12 : radar + annulation gratuite ; statut temps réel accepted → C-13 ;
// 90 s sans attribution → état « aucun chauffeur ».

import { act, render, screen, userEvent } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ rideId: "ride-1" }),
}));

jest.mock("@maplibre/maplibre-react-native", () => ({
  Map: () => null,
  Camera: () => null,
  GeoJSONSource: () => null,
  Layer: () => null,
}));

jest.mock("../data/data-state", () => ({
  useDataUsage: () => ({ quantityText: "13 Mo", state: "normal" }),
  useResolvedMapMode: () => ({ mode: "full" }),
}));

jest.mock("../../lib/supabase", () => ({ supabase: {} }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Boucle Animated sans fin — inutile sous jest.
jest.mock("./radar-pulse", () => ({ RadarPulse: () => null }));

let statusCallback: ((status: string) => void) | null = null;
const mockUnsubscribe = jest.fn().mockResolvedValue(undefined);
const mockCancelRide = jest.fn();
jest.mock("@teko/api-client", () => ({
  cancelRide: (...args: unknown[]) => mockCancelRide(...args),
  createRealtimePositionsChannel: () => ({
    subscribeRideStatus: (_rideId: string, cb: (status: string) => void) => {
      statusCallback = cb;
      return mockUnsubscribe;
    },
  }),
}));

import Searching from "../../../app/(main)/searching";
import { useBookingStore } from "./store";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const DRAFT = {
  origin: { position: { lon: 9.45, lat: 0.4 }, label: "Ma position" },
  meeting: { id: "lm-9", name: "Pharmacie du Gros-Bouquet", position: { lon: 9.451, lat: 0.401 } },
  estimates: { eco: 1500 },
};

beforeEach(() => {
  jest.clearAllMocks();
  statusCallback = null;
  useBookingStore.getState().reset();
  useBookingStore.setState(DRAFT);
});

describe("C-12 Recherche chauffeur", () => {
  it("affiche la recherche et bascule vers C-13 dès l'attribution", () => {
    render(<Searching />);

    expect(screen.getByText("Recherche d'un chauffeur…")).toBeOnTheScreen();
    expect(screen.getByText(/Annulation gratuite/)).toBeOnTheScreen();
    expect(screen.getByText("Pharmacie du Gros-Bouquet", { exact: false })).toBeOnTheScreen();

    act(() => statusCallback?.("accepted"));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(main)/ride/[id]",
      params: { id: "ride-1" },
    });
  });

  it("Annuler la demande → cancel_ride puis retour accueil", async () => {
    mockCancelRide.mockResolvedValue({ id: "ride-1", status: "cancelled" });
    const user = userEvent.setup();
    render(<Searching />);

    await user.press(screen.getByTestId("cancel-ride"));

    expect(mockCancelRide).toHaveBeenCalledWith({}, "ride-1");
    expect(mockReplace).toHaveBeenCalledWith("/(main)/home");
    expect(useBookingStore.getState().origin).toBeNull();
  });

  it("90 s sans attribution → état « aucun chauffeur » avec réessai", () => {
    jest.useFakeTimers();
    try {
      render(<Searching />);
      act(() => {
        jest.advanceTimersByTime(90_000);
      });
      expect(screen.getByText("Aucun chauffeur disponible pour le moment")).toBeOnTheScreen();
      expect(screen.getByTestId("retry-category")).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});
