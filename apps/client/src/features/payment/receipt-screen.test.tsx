// C-17 : récapitulatif fidèle (trajet, total mono, pastille), partage
// RN Share, retour accueil = reset du brouillon + navigation home.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatXaf } from "@teko/core";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Share } from "react-native";
import { useBookingStore } from "../booking/store";

const mockGetRide = jest.fn();
const mockListPayments = jest.fn();
const mockGetPayment = jest.fn();
const mockGetProfile = jest.fn();
jest.mock("@teko/api-client", () => ({
  getRide: (...a: unknown[]) => mockGetRide(...a),
  listPaymentsForRide: (...a: unknown[]) => mockListPayments(...a),
  getPayment: (...a: unknown[]) => mockGetPayment(...a),
  getProfile: (...a: unknown[]) => mockGetProfile(...a),
  invokeCollect: jest.fn(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ rideId: "ride-1" }),
}));

import ReceiptScreen from "../../../app/(main)/receipt/[rideId]";

const ride = {
  id: "0147ab00-0000-0000-0000-000000000000",
  payment_method: "cash",
  price_final: "1500",
  price_est: 1200,
  category: "eco",
  origin_hint: "Pharmacie du Gros-Bouquet",
  dest_hint: "Lycée Léon Mba",
  started_at: new Date(2026, 7, 26, 14, 29).toISOString(),
  completed_at: new Date(2026, 7, 26, 14, 46).toISOString(),
  duration_est_s: 840,
  distance_est_m: 5200,
  driver_id: "driver-1",
  created_at: new Date(2026, 7, 26, 14, 20).toISOString(),
};

function renderScreen(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRide.mockResolvedValue(ride);
  mockGetProfile.mockRejectedValue(new Error("RLS"));
});

describe("C-17 Reçu", () => {
  it("affiche le récapitulatif : trajet, durée réelle, total, pastille", async () => {
    renderScreen(<ReceiptScreen />);

    expect(await screen.findByText("Course terminée")).toBeOnTheScreen();
    expect(screen.getByText(/Pharmacie du Gros-Bouquet · 14 h 29/)).toBeOnTheScreen();
    expect(screen.getByText(/Lycée Léon Mba · 14 h 46/)).toBeOnTheScreen();
    expect(screen.getByText(/Course Éco · 17 min · 5,2 km/)).toBeOnTheScreen();
    expect(screen.getAllByText(formatXaf(1500, "FCFA")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Paiement confirmé")).toBeOnTheScreen();
    expect(screen.getByText("Espèces")).toBeOnTheScreen();
    // Profil chauffeur masqué par la RLS : la ligne retombe sur « — ».
    expect(await screen.findByText("—")).toBeOnTheScreen();
  });

  it("partage le reçu via RN Share", async () => {
    const partage = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    const user = userEvent.setup();
    renderScreen(<ReceiptScreen />);

    await user.press(await screen.findByTestId("receipt-share"));
    await waitFor(() =>
      expect(partage).toHaveBeenCalledWith({
        message: expect.stringContaining("Pharmacie du Gros-Bouquet"),
      }),
    );
  });

  it("retour à l'accueil : reset du brouillon puis navigation home", async () => {
    useBookingStore.setState({ category: "moto" });
    const user = userEvent.setup();
    renderScreen(<ReceiptScreen />);

    await user.press(await screen.findByTestId("receipt-home"));
    expect(useBookingStore.getState().category).toBe("eco");
    expect(mockReplace).toHaveBeenCalledWith("/(main)/home");
  });
});
