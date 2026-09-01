// D-01 : parcours F (constaté en E2E sur Pixel 3) — se reconnecter pendant
// la fenêtre de 30 jours rétracte la demande de suppression et le confirme
// explicitement ; une session saine ne déclenche aucune alerte.

import { render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockGetMyDriver = jest.fn();
const mockFindActiveRide = jest.fn();
const mockRestore = jest.fn();
jest.mock("@teko/api-client", () => ({
  getMyDriver: (...args: unknown[]) => mockGetMyDriver(...args),
  findActiveRide: (...args: unknown[]) => mockFindActiveRide(...args),
  restoreAccountIfDeletionPending: (...args: unknown[]) => mockRestore(...args),
}));
jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { user: { id: "d1" } } } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

import Splash from "../../../app/index";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMyDriver.mockResolvedValue({ id: "d1", kyc_status: "validated" });
  mockFindActiveRide.mockResolvedValue(null);
});

describe("D-01 Splash — rétractation de la suppression au retour (parcours F)", () => {
  it("suppression en attente : rétractation appelée puis confirmée explicitement", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockRestore.mockResolvedValue(true);
    render(<Splash />);

    await waitFor(() => expect(mockRestore).toHaveBeenCalledWith(expect.anything(), "d1"));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Compte restauré",
        expect.stringContaining("restauré à l'identique"),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(main)/home");
  });

  it("session saine : aucune alerte, routage vers l'accueil inchangé", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockRestore.mockResolvedValue(false);
    render(<Splash />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(main)/home"));
    expect(mockRestore).toHaveBeenCalledWith(expect.anything(), "d1");
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
