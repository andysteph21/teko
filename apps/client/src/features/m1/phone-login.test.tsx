// Test de composant (jest-expo + RNTL) : le parcours OTP côté UI —
// envoi du code puis vérification, erreurs affichées en français.

import { render, screen, userEvent } from "@testing-library/react-native";

jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockSignIn = jest.fn();
const mockVerify = jest.fn();
jest.mock("@teko/api-client", () => ({
  signInWithPhoneOtp: (...args: unknown[]) => mockSignIn(...args),
  verifyPhoneOtp: (...args: unknown[]) => mockVerify(...args),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));

import { PhoneLogin } from "./phone-login";

// L'i18n réel du monorepo, initialisé de façon synchrone pour le test.
beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  await createTekoI18n({ plugins: [initReactI18next] });
});

describe("PhoneLogin", () => {
  it("pré-remplit le numéro de test et envoie l'OTP", async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<PhoneLogin />);

    expect(screen.getByDisplayValue("+24107000001")).toBeOnTheScreen();
    await user.press(screen.getByText("Recevoir le code"));

    expect(mockSignIn).toHaveBeenCalledWith({}, "+24107000001");
    expect(await screen.findByText("Code de vérification")).toBeOnTheScreen();
  });

  it("affiche l'erreur française si le code est refusé", async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    mockVerify.mockRejectedValueOnce(new Error("Token has expired"));
    const user = userEvent.setup();
    render(<PhoneLogin />);

    await user.press(screen.getByText("Recevoir le code"));
    const codeInput = await screen.findByDisplayValue("");
    await user.type(codeInput, "000000");
    await user.press(screen.getByText("Continuer"));

    expect(await screen.findByText("Code incorrect. Vérifiez et réessayez.")).toBeOnTheScreen();
  });
});
