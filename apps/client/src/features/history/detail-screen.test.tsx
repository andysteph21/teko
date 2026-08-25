// C-20 : fiche complète d'une course terminée + accès au reçu.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { screen, userEvent } from "@testing-library/react-native";

const mockGetRide = jest.fn();
const mockGetProfile = jest.fn();
jest.mock("@teko/api-client", () => ({
  getRide: (...args: unknown[]) => mockGetRide(...args),
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "ride-1" }),
}));

import HistoryDetail from "../../../app/(main)/history/[id]";
import { renderWithQuery } from "./test-utils";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const now = new Date();
const completedRide = {
  id: "ride-1",
  status: "completed",
  category: "eco",
  driver_id: "d1",
  created_at: now.toISOString(),
  scheduled_at: null,
  started_at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 29).toISOString(),
  completed_at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 46).toISOString(),
  origin_hint: "Pharmacie du Gros-Bouquet",
  dest_hint: "Lycée Léon Mba",
  payment_method: "airtel",
  price_est: "1400",
  price_final: "1500",
  distance_est_m: 5200,
} as unknown as RideRow;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRide.mockResolvedValue(completedRide);
  mockGetProfile.mockResolvedValue({ id: "d1", full_name: "Boris M." });
});

describe("C-20 Détail de course", () => {
  it("affiche trajet, chauffeur, paiement et total payé", async () => {
    renderWithQuery(<HistoryDetail />);

    expect(await screen.findByText("Course Éco")).toBeOnTheScreen();
    expect(screen.getByText("Terminée")).toBeOnTheScreen();
    expect(screen.getByText("Pharmacie du Gros-Bouquet")).toBeOnTheScreen();
    expect(screen.getByText("Lycée Léon Mba")).toBeOnTheScreen();
    expect(screen.getByText(/14 h 29 → 14 h 46/)).toBeOnTheScreen();
    expect(screen.getByText(/5,2 km/)).toBeOnTheScreen();
    expect(await screen.findByText("Boris M.")).toBeOnTheScreen();
    expect(screen.getByText("Airtel Money")).toBeOnTheScreen();
    expect(screen.getByText("Total payé")).toBeOnTheScreen();
    expect(screen.getByText(formatXaf(1500, "FCFA"))).toBeOnTheScreen();
  });

  it("« Voir le reçu » → reçu de la course", async () => {
    const user = userEvent.setup();
    renderWithQuery(<HistoryDetail />);
    await screen.findByTestId("detail-receipt");

    await user.press(screen.getByTestId("detail-receipt"));

    expect(mockPush).toHaveBeenCalledWith("/(main)/receipt/ride-1");
  });

  it("course non terminée : pas de bouton reçu", async () => {
    mockGetRide.mockResolvedValue({ ...completedRide, status: "cancelled_client" });
    renderWithQuery(<HistoryDetail />);

    await screen.findByText("Course Éco");
    expect(screen.queryByTestId("detail-receipt")).toBeNull();
  });
});
