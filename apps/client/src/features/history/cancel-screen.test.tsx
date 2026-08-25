// C-21 : frais annoncés avant confirmation (jamais la formule), motif
// obligatoire, annulation → retour accueil + brouillon vidé.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { screen, userEvent, waitFor } from "@testing-library/react-native";

const mockGetRide = jest.fn();
const mockEstimateFee = jest.fn().mockResolvedValue(500);
const mockCancelRide = jest.fn();
jest.mock("@teko/api-client", () => ({
  getRide: (...args: unknown[]) => mockGetRide(...args),
  cancelRide: (...args: unknown[]) => mockCancelRide(...args),
  estimateCancellationFee: () => mockEstimateFee(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ id: "ride-1" }),
}));

import CancelScreen from "../../../app/(main)/cancel/[id]";
import { useBookingStore } from "../booking/store";
import { renderWithQuery } from "./test-utils";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const acceptedRide = {
  id: "ride-1",
  status: "accepted",
  category: "eco",
  driver_id: "d1",
  created_at: new Date().toISOString(),
  scheduled_at: null,
  price_est: "2500",
  price_final: null,
} as unknown as RideRow;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRide.mockResolvedValue(acceptedRide);
  mockCancelRide.mockResolvedValue({});
});

describe("C-21 Annulation", () => {
  it("chauffeur attribué : le montant des frais est annoncé (300 F / 20 %)", async () => {
    renderWithQuery(<CancelScreen />);

    // max(300, 20 % de 2 500) = 500 — montant seul, jamais la formule.
    expect(await screen.findByText(/des frais d'annulation de/)).toBeOnTheScreen();
    expect(
      await screen.findByText(`Confirmer l'annulation · ${formatXaf(500, "FCFA")}`),
    ).toBeOnTheScreen();
  });

  it("avant attribution : annulation gratuite", async () => {
    mockGetRide.mockResolvedValue({ ...acceptedRide, status: "requested", driver_id: null });
    renderWithQuery(<CancelScreen />);

    expect(await screen.findByText("Annulation gratuite avant attribution.")).toBeOnTheScreen();
    expect(screen.getByText("Confirmer l'annulation")).toBeOnTheScreen();
  });

  it("motif + confirmation → cancel_ride, accueil, brouillon vidé", async () => {
    useBookingStore.setState({ scheduledAt: "2026-08-26T08:00:00.000Z" });
    const user = userEvent.setup();
    renderWithQuery(<CancelScreen />);
    await screen.findByTestId("reason-motifPlans");

    await user.press(screen.getByTestId("reason-motifPlans"));
    await user.press(screen.getByTestId("cancel-confirm"));

    await waitFor(() =>
      expect(mockCancelRide).toHaveBeenCalledWith({}, "ride-1", "Changement de plans"),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(main)/home");
    expect(useBookingStore.getState().scheduledAt).toBeNull();
  });

  it("sans motif : le bouton de confirmation reste désactivé", async () => {
    renderWithQuery(<CancelScreen />);
    await screen.findByTestId("cancel-confirm");

    expect(screen.getByTestId("cancel-confirm")).toBeDisabled();
    expect(mockCancelRide).not.toHaveBeenCalled();
  });
});
