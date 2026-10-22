// C-16 : étoiles obligatoires avant envoi, compliments fusionnés au
// commentaire, « Passer » toujours possible, repli « Votre chauffeur »
// quand la RLS masque le profil du chauffeur.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";

const mockGetRide = jest.fn();
const mockRateRide = jest.fn();
const mockGetProfile = jest.fn();
jest.mock("@teko/api-client", () => ({
  getRide: (...a: unknown[]) => mockGetRide(...a),
  rateRide: (...a: unknown[]) => mockRateRide(...a),
  getProfile: (...a: unknown[]) => mockGetProfile(...a),
  listPaymentsForRide: jest.fn(),
  getPayment: jest.fn(),
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

jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "client-1" } }, loading: false }),
}));

import RatingScreen from "../../../app/(main)/rating/[rideId]";

const ride = {
  id: "ride-1",
  driver_id: "driver-1",
  category: "eco",
  completed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
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

describe("C-16 Évaluation", () => {
  it("profil chauffeur masqué (RLS) : repli « Votre chauffeur », envoi 5 étoiles", async () => {
    mockRateRide.mockResolvedValue({});
    const user = userEvent.setup();
    renderScreen(<RatingScreen />);

    expect(await screen.findByText(/Votre chauffeur/)).toBeOnTheScreen();
    // Pas d'étoile choisie : le CTA reste désactivé, rien ne part.
    await user.press(screen.getByTestId("rating-submit"));
    expect(mockRateRide).not.toHaveBeenCalled();

    await user.press(screen.getByTestId("star-5"));
    expect(screen.getByText("Excellent")).toBeOnTheScreen();
    await user.press(screen.getByTestId("chip-chipAimable"));
    await user.type(screen.getByTestId("rating-comment"), "Super trajet");
    await user.press(screen.getByTestId("rating-submit"));

    await waitFor(() =>
      expect(mockRateRide).toHaveBeenCalledWith(
        {},
        {
          rideId: "ride-1",
          fromUser: "client-1",
          toUser: "driver-1",
          stars: 5,
          comment: "Aimable — Super trajet",
        },
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(main)/receipt/ride-1");
  });

  it("« Passer » mène au reçu sans noter", async () => {
    const user = userEvent.setup();
    renderScreen(<RatingScreen />);

    await user.press(await screen.findByTestId("rating-skip"));
    expect(mockRateRide).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(main)/receipt/ride-1");
  });
});
