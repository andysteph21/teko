// D-04 identité 1/4 : nom complet + catégories → création de la fiche
// chauffeur (pending) puis passage aux documents.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Providers } from "./test-wrapper";

const mockUpdateProfile = jest.fn();
const mockCreateDriver = jest.fn();
jest.mock("@teko/api-client", () => ({
  getProfile: jest.fn().mockResolvedValue({ full_name: null }),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  createDriverProfile: (...args: unknown[]) => mockCreateDriver(...args),
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

import Identity from "../../../app/(auth)/identity";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("D-04 Identité", () => {
  it("crée la fiche chauffeur avec les catégories choisies puis va aux documents", async () => {
    mockUpdateProfile.mockResolvedValueOnce({});
    mockCreateDriver.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<Identity />, { wrapper: Providers });

    await user.type(screen.getByTestId("identity-first-name"), "Boris");
    await user.type(screen.getByTestId("identity-last-name"), "Mba");
    await user.press(screen.getByTestId("category-eco"));
    await user.press(screen.getByTestId("category-confort"));
    await user.press(screen.getByTestId("identity-continue"));

    await waitFor(() =>
      expect(mockCreateDriver).toHaveBeenCalledWith({}, "u1", ["eco", "confort"]),
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith({}, "u1", { fullName: "Boris Mba" });
    expect(mockPush).toHaveBeenCalledWith("/(auth)/documents");
  });

  it("aucune catégorie : erreur explicite, pas de création", async () => {
    const user = userEvent.setup();
    render(<Identity />, { wrapper: Providers });

    await user.type(screen.getByTestId("identity-first-name"), "Boris");
    await user.type(screen.getByTestId("identity-last-name"), "Mba");
    await user.press(screen.getByTestId("identity-continue"));

    expect(await screen.findByText("Choisissez au moins une catégorie.")).toBeOnTheScreen();
    expect(mockCreateDriver).not.toHaveBeenCalled();
  });
});
