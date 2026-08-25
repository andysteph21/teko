// C-23 : rendu du hub (nom, numéro, compte de repères validés) et
// déconnexion avec confirmation → signOut → retour à la racine.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockGetProfile = jest.fn();
const mockProposals = jest.fn();
const mockSignOut = jest.fn();
jest.mock("@teko/api-client", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  listMyLandmarkProposals: (...args: unknown[]) => mockProposals(...args),
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
  mockGetProfile.mockResolvedValue({
    id: "u1",
    full_name: "Nadia Obame",
    phone: "+24106123456",
    email: null,
  });
  mockProposals.mockResolvedValue([
    { status: "validated" },
    { status: "validated" },
    { status: "proposed" },
  ]);
});

describe("C-23 Profil & paramètres", () => {
  it("affiche prénom, numéro formaté et repères validés", async () => {
    render(<Profile />, { wrapper: Providers });

    expect(await screen.findByText("Nadia")).toBeOnTheScreen();
    expect(screen.getByText("+241 06 12 34 56")).toBeOnTheScreen();
    expect(await screen.findByText("2 validés")).toBeOnTheScreen();
    expect(screen.getByText("Se déconnecter")).toBeOnTheScreen();
    expect(screen.getByText("Supprimer mon compte")).toBeOnTheScreen();
  });

  it("déconnexion : confirmation puis signOut et retour racine", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockSignOut.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<Profile />, { wrapper: Providers });

    await user.press(await screen.findByTestId("hub-signout"));
    expect(alertSpy).toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0]?.[2];
    buttons?.[1]?.onPress?.();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("navigation : modifier le profil et suppression", async () => {
    const user = userEvent.setup();
    render(<Profile />, { wrapper: Providers });

    await user.press(await screen.findByTestId("hub-edit"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/profile-edit");
    await user.press(screen.getByTestId("hub-delete"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/delete-account");
  });
});
