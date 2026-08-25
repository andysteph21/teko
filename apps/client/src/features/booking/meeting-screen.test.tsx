// C-11 : suggestion de point de rencontre, envoi request_ride → C-12 ;
// course planifiée → confirmation « Course planifiée » sans radar.

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

const mockRequestRide = jest.fn();
jest.mock("@teko/api-client", () => ({
  requestRide: (...args: unknown[]) => mockRequestRide(...args),
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
};

const SUGGESTION = {
  id: "lm-9",
  name: "Pharmacie du Gros-Bouquet",
  position: { lon: 9.451, lat: 0.401 },
};

function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useBookingStore.setState(DRAFT);
  mockSuggest.mockResolvedValue(SUGGESTION);
});

describe("C-11 Point de rencontre", () => {
  it("confirme le repère suggéré et commande → C-12", async () => {
    mockRequestRide.mockResolvedValue({ id: "ride-1" });
    const user = userEvent.setup();
    renderScreen(<Meeting />);

    expect(await screen.findByText("Pharmacie du Gros-Bouquet")).toBeOnTheScreen();
    await user.press(screen.getByTestId("meeting-confirm"));

    expect(useBookingStore.getState().meeting).toEqual(SUGGESTION);
    expect(mockRequestRide).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        category: "eco",
        origin: DRAFT.origin.position,
        destination: DRAFT.destination.position,
        distanceM: 4200,
        durationS: 840,
        paymentMethod: "cash",
        destinationLandmarkId: "lm-1",
        originHint: "portail bleu",
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
    expect(mockRequestRide).toHaveBeenCalled();
  });

  it("course planifiée : confirmation « Course planifiée », pas de radar", async () => {
    mockRequestRide.mockResolvedValue({ id: "ride-3" });
    useBookingStore.setState({ scheduledAt: "2026-08-26T09:00:00Z" });
    const user = userEvent.setup();
    renderScreen(<Meeting />);

    await screen.findByText("Pharmacie du Gros-Bouquet");
    await user.press(screen.getByTestId("meeting-confirm"));

    expect(await screen.findByText("Course planifiée")).toBeOnTheScreen();
    expect(mockRequestRide).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ scheduledAt: "2026-08-26T09:00:00Z" }),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
