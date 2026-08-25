// D-06 véhicule 3/4 : plaque en majuscules, catégorie dérivée du type et
// des catégories exercées → enregistrement puis versements.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Providers } from "./test-wrapper";

const mockGetMyDriver = jest.fn();
const mockUpsertVehicle = jest.fn();
jest.mock("@teko/api-client", () => ({
  getMyDriver: (...args: unknown[]) => mockGetMyDriver(...args),
  upsertVehicle: (...args: unknown[]) => mockUpsertVehicle(...args),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "u1" } }, loading: false }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import Vehicle from "../../../app/(auth)/vehicle";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("D-06 Véhicule", () => {
  it("enregistre la plaque en majuscules avec la catégorie Éco puis continue", async () => {
    mockGetMyDriver.mockResolvedValue({ id: "u1", categories: ["eco"], kyc_status: "pending" });
    mockUpsertVehicle.mockResolvedValueOnce({ id: "v1" });
    const user = userEvent.setup();
    render(<Vehicle />, { wrapper: Providers });

    await user.type(screen.getByTestId("vehicle-plate"), "ga-482-lbv");
    await user.press(screen.getByTestId("vehicle-continue"));

    await waitFor(() =>
      expect(mockUpsertVehicle).toHaveBeenCalledWith(
        {},
        { driverId: "u1", category: "eco", plate: "GA-482-LBV" },
      ),
    );
    expect(mockPush).toHaveBeenCalledWith("/(auth)/payout");
  });

  it("plaque vide : erreur explicite, pas d'enregistrement", async () => {
    mockGetMyDriver.mockResolvedValue({ id: "u1", categories: ["eco"], kyc_status: "pending" });
    const user = userEvent.setup();
    render(<Vehicle />, { wrapper: Providers });

    await user.press(screen.getByTestId("vehicle-continue"));

    expect(await screen.findByText("Indiquez votre plaque d'immatriculation.")).toBeOnTheScreen();
    expect(mockUpsertVehicle).not.toHaveBeenCalled();
  });
});
