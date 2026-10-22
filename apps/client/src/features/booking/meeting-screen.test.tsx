// C-11 : rencontre → nouveau devis à confirmer ; garder le GPS → départ exact.
// Aucun brouillon programmé ne peut commander pendant l'alpha.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent } from "@testing-library/react-native";
import type { ReactElement } from "react";

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Redirect: () => null,
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

const mockRequestRide = jest.fn();
const mockGetRideQuote = jest.fn();
jest.mock("@teko/api-client", () => ({
  requestQuotedRide: (...args: unknown[]) => mockRequestRide(...args),
  getRideQuote: (...args: unknown[]) => mockGetRideQuote(...args),
  quoteRoute: (q: { distance_m: number; duration_s: number }) => ({
    coordinates: [],
    distanceM: q.distance_m,
    durationS: q.duration_s,
  }),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));

const mockSuggest = jest.fn();
jest.mock("@teko/maps", () => ({
  ...jest.requireActual("@teko/maps"),
  TekoMapData: class {
    suggestMeetingLandmark = (...args: unknown[]) => mockSuggest(...args);
  },
}));

import Meeting from "../../../app/(main)/meeting";
import { useBookingStore } from "./store";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const DRAFT = {
  origin: { position: { lon: 9.45, lat: 0.4 }, label: "Ma position", hint: "portail bleu" },
  destination: {
    position: { lon: 9.46, lat: 0.41 },
    label: "Lycée Léon Mba",
    landmarkId: "lm-1",
  },
  route: { coordinates: [], distanceM: 4200, durationS: 840 },
  estimates: { eco: 1500 },
  quotes: {
    eco: {
      id: "quote-eco",
      client_id: "client-1",
      category: "eco" as const,
      origin_geom: null,
      dest_geom: null,
      distance_m: 4200,
      duration_s: 840,
      price: 1500,
      route_shape: "fixture",
      created_at: "2026-10-18T00:00:00Z",
      expires_at: "2026-10-18T00:05:00Z",
      ride_id: null,
    },
  },
};

const SUGGESTION = {
  id: "lm-9",
  name: "Pharmacie du Gros-Bouquet",
  position: { lon: 9.451, lat: 0.401 },
};

function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useBookingStore.setState(DRAFT);
  useBookingStore.setState({
    quotes: {
      eco: { ...DRAFT.quotes.eco, expires_at: new Date(Date.now() + 300000).toISOString() },
    },
  });
  mockGetRideQuote.mockResolvedValue({
    ...DRAFT.quotes.eco,
    id: "quote-meeting",
    price: 1700,
    expires_at: new Date(Date.now() + 300000).toISOString(),
  });
  mockSuggest.mockResolvedValue(SUGGESTION);
});

describe("C-11 Point de rencontre", () => {
  it("confirme le repère suggéré et commande → C-12", async () => {
    mockRequestRide.mockResolvedValue({ id: "ride-1" });
    const user = userEvent.setup();
    renderScreen(<Meeting />);

    expect(await screen.findByText("Pharmacie du Gros-Bouquet")).toBeOnTheScreen();
    await user.press(screen.getByTestId("meeting-confirm"));

    expect(await screen.findByTestId("pickup-new-price")).toHaveTextContent(
      /Nouveau prix ferme : 1\s700\sF/,
    );
    expect(mockRequestRide).not.toHaveBeenCalled();
    expect(mockGetRideQuote).toHaveBeenCalledWith(
      {},
      { category: "eco", origin: SUGGESTION.position, destination: DRAFT.destination.position },
    );
    await user.press(screen.getByTestId("pickup-price-confirm"));
    expect(useBookingStore.getState().meeting).toEqual(SUGGESTION);
    expect(mockRequestRide).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        quoteId: "quote-meeting",
        meetingLandmarkId: SUGGESTION.id,
        destinationLandmarkId: "lm-1",
        originHint: undefined,
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(main)/searching",
      params: { rideId: "ride-1" },
    });
  });

  it("« Garder ma position » commande sans point de rencontre", async () => {
    mockRequestRide.mockResolvedValue({ id: "ride-2" });
    const user = userEvent.setup();
    renderScreen(<Meeting />);

    await screen.findByText("Pharmacie du Gros-Bouquet");
    await user.press(screen.getByTestId("meeting-keep-position"));

    expect(useBookingStore.getState().meeting).toBeNull();
    expect(mockRequestRide).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ quoteId: "quote-eco", meetingLandmarkId: undefined }),
    );
    expect(mockGetRideQuote).not.toHaveBeenCalled();
  });

  it("revenir au départ initial après le nouveau devis ne commande rien", async () => {
    const user = userEvent.setup();
    renderScreen(<Meeting />);
    await user.press(await screen.findByTestId("meeting-confirm"));
    await user.press(await screen.findByTestId("pickup-price-cancel"));
    expect(useBookingStore.getState().origin).toEqual(DRAFT.origin);
    expect(useBookingStore.getState().quotes.eco?.id).toBe("quote-eco");
    expect(mockRequestRide).not.toHaveBeenCalled();
  });

  it("un itinéraire de rencontre indisponible ne commande rien et conserve le départ initial", async () => {
    mockGetRideQuote.mockRejectedValueOnce(new Error("route unavailable"));
    const user = userEvent.setup();
    renderScreen(<Meeting />);
    await user.press(await screen.findByTestId("meeting-confirm"));
    expect(await screen.findByText("Une erreur est survenue. Réessayez.")).toBeOnTheScreen();
    expect(useBookingStore.getState().origin).toEqual(DRAFT.origin);
    expect(mockRequestRide).not.toHaveBeenCalled();
  });

  it("un devis de rencontre expiré est recalculé et demande une nouvelle confirmation", async () => {
    const initial = {
      ...DRAFT.quotes.eco,
      id: "quote-expired",
      price: 1700,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    mockGetRideQuote.mockResolvedValueOnce(initial).mockResolvedValueOnce({
      ...initial,
      id: "quote-refreshed",
      price: 1800,
      expires_at: new Date(Date.now() + 300000).toISOString(),
    });
    mockRequestRide.mockResolvedValue({ id: "ride-refreshed" });
    const user = userEvent.setup();
    renderScreen(<Meeting />);
    await user.press(await screen.findByTestId("meeting-confirm"));
    await user.press(await screen.findByTestId("pickup-price-confirm"));
    expect(await screen.findByText(/Nouveau prix ferme : 1\s800/)).toBeOnTheScreen();
    expect(mockGetRideQuote).toHaveBeenCalledTimes(2);
    expect(mockRequestRide).not.toHaveBeenCalled();
    await user.press(screen.getByTestId("pickup-price-confirm"));
    expect(mockRequestRide).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ quoteId: "quote-refreshed" }),
    );
  });

  it("garder la position avec un devis expiré requiert aussi un nouveau prix confirmé", async () => {
    useBookingStore.setState({
      quotes: {
        eco: { ...DRAFT.quotes.eco, expires_at: new Date(Date.now() - 1000).toISOString() },
      },
    });
    const user = userEvent.setup();
    renderScreen(<Meeting />);
    await user.press(await screen.findByTestId("meeting-keep-position"));
    await screen.findByTestId("pickup-new-price");
    expect(mockGetRideQuote).toHaveBeenCalledWith(
      {},
      { category: "eco", origin: DRAFT.origin.position, destination: DRAFT.destination.position },
    );
    expect(mockRequestRide).not.toHaveBeenCalled();
  });

  it("un brouillon programmé hérité n'est pas envoyé pendant l’alpha", async () => {
    mockRequestRide.mockResolvedValue({ id: "ride-3" });
    useBookingStore.setState({ scheduledAt: "2026-08-26T09:00:00Z" });
    const user = userEvent.setup();
    renderScreen(<Meeting />);

    await screen.findByText("Pharmacie du Gros-Bouquet");
    await user.press(screen.getByTestId("meeting-keep-position"));

    expect(await screen.findByText("Une erreur est survenue. Réessayez.")).toBeOnTheScreen();
    expect(mockRequestRide).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
