// D-18 : en-tête teal (nom, note ★, catégories), statut par pièce avec
// motif de refus, numéro de versement masqué, stub « Changer de numéro »
// et déconnexion confirmée → racine.

import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockGetProfile = jest.fn();
const mockGetMyDriver = jest.fn();
const mockListMyDocuments = jest.fn();
const mockSignOut = jest.fn();
jest.mock("@teko/api-client", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  getMyDriver: (...args: unknown[]) => mockGetMyDriver(...args),
  listMyDocuments: (...args: unknown[]) => mockListMyDocuments(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { user: { id: "u1" } } } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

import Profile from "../../../app/(main)/profile";
import { Providers } from "./test-wrapper";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProfile.mockResolvedValue({ id: "u1", full_name: "Boris Mba", phone: "+24107894512" });
  mockGetMyDriver.mockResolvedValue({
    id: "u1",
    categories: ["eco"],
    // rating numérique en chaîne via supabase-js.
    rating_avg: "4.8",
    created_at: "2026-06-10T08:00:00Z",
    payout_msisdn: "+24107894512",
    kyc_status: "validated",
    gps_consent: true,
  });
  mockListMyDocuments.mockResolvedValue([
    { id: "d1", type: "license", status: "validated", note: null },
    { id: "d2", type: "insurance", status: "pending", note: null },
    { id: "d3", type: "registration", status: "rejected", note: "Photo illisible" },
  ]);
});

describe("D-18 Profil & documents", () => {
  it("affiche l'en-tête (nom, note, ancienneté), les pièces et le numéro masqué", async () => {
    render(<Profile />, { wrapper: Providers });

    expect(await screen.findByText("Boris Mba")).toBeOnTheScreen();
    expect(screen.getByTestId("profile-rating")).toHaveTextContent("★ 4,8");
    expect(screen.getByText("Chauffeur Éco · depuis juin 2026")).toBeOnTheScreen();
    expect(screen.getByText("Permis de conduire")).toBeOnTheScreen();
    expect(screen.getByText("Validée")).toBeOnTheScreen();
    expect(screen.getByText("En cours")).toBeOnTheScreen();
    expect(screen.getByText("Refusée")).toBeOnTheScreen();
    expect(screen.getByText("Motif : Photo illisible")).toBeOnTheScreen();
    expect(screen.getByText("+241 •• •• 45 12 · vérifié")).toBeOnTheScreen();
  });

  it("« Changer de numéro » : stub double vérification (parcours J à venir)", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const user = userEvent.setup();
    render(<Profile />, { wrapper: Providers });
    await screen.findByText("Boris Mba");

    await user.press(screen.getByTestId("payout-change"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Double vérification",
      expect.stringContaining("arrive bientôt"),
    );
  });

  it("déconnexion confirmée → signOut puis retour à la racine", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<Profile />, { wrapper: Providers });
    await screen.findByText("Boris Mba");

    await user.press(screen.getByTestId("profile-signout"));
    const buttons = alertSpy.mock.calls[0]?.[2];
    await act(async () => {
      buttons?.[1]?.onPress?.();
    });

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });
});
