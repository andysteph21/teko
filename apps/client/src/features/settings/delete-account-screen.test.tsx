// C-28 : garde-fou (Alert deux boutons) → requestAccountDeletion → état
// « Compte désactivé » → fermeture = signOut + racine ; erreur dédiée si
// une course est en cours (TekoApiError.code, jamais de string-match).

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockRequestDeletion = jest.fn();
const mockSignOut = jest.fn();
jest.mock("@teko/api-client", () => ({
  requestAccountDeletion: (...args: unknown[]) => mockRequestDeletion(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  TekoApiError: class TekoApiError extends Error {
    code: string;
    constructor(code = "unknown", message = "") {
      super(message);
      this.code = code;
    }
  },
}));

const { TekoApiError: MockApiError } = jest.requireMock("@teko/api-client") as {
  TekoApiError: new (code?: string, message?: string) => Error;
};
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack }),
}));

import DeleteAccount from "../../../app/(main)/delete-account";
import { Providers } from "./test-wrapper";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

const confirmViaAlert = (alertSpy: jest.SpyInstance) => {
  const buttons = alertSpy.mock.calls[0]?.[2];
  buttons?.[1]?.onPress?.();
};

describe("C-28 Suppression de compte", () => {
  it("liste honnête : supprimé vs conservé anonymisé + 30 jours", () => {
    render(<DeleteAccount />, { wrapper: Providers });

    expect(screen.getByText("Supprimé définitivement")).toBeOnTheScreen();
    expect(screen.getByText("Conservé anonymisé (obligation légale)")).toBeOnTheScreen();
    expect(screen.getByText(/écritures financières des paiements passés/)).toBeOnTheScreen();
    expect(screen.getByText("30 jours pour changer d'avis")).toBeOnTheScreen();
    expect(screen.getByText("Garder mon compte")).toBeOnTheScreen();
  });

  it("confirmation → requestAccountDeletion → état désactivé → fermeture", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockRequestDeletion.mockResolvedValueOnce("2026-09-24T00:00:00Z");
    mockSignOut.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<DeleteAccount />, { wrapper: Providers });

    await user.press(screen.getByTestId("delete-cta"));
    expect(alertSpy).toHaveBeenCalled();
    confirmViaAlert(alertSpy);

    expect(await screen.findByText("Compte désactivé")).toBeOnTheScreen();
    expect(screen.getByTestId("delete-done")).toHaveTextContent(/24 septembre/);

    await user.press(screen.getByTestId("delete-close"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("course en cours : message dédié via TekoApiError.code", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockRequestDeletion.mockRejectedValueOnce(new MockApiError("ride_in_progress"));
    const user = userEvent.setup();
    render(<DeleteAccount />, { wrapper: Providers });

    await user.press(screen.getByTestId("delete-cta"));
    confirmViaAlert(alertSpy);

    expect(await screen.findByTestId("delete-error")).toHaveTextContent(/course est en cours/);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
