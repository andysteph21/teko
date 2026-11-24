// C-03 e-mail : validation de l'adresse, envoi du code, navigation vers C-04.

import { render, screen, userEvent } from "@testing-library/react-native";

const mockSignIn = jest.fn();
jest.mock("@teko/api-client", () => ({
  signInWithEmailOtp: (...args: unknown[]) => mockSignIn(...args),
  signInWithPhoneOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
  verifyPhoneOtp: jest.fn(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import Email from "../../../app/(auth)/email";
import { isValidEmail, otpChannel } from "./otp-channel";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("otp-channel", () => {
  it("valide l'adresse et choisit le canal e-mail avant le numéro", () => {
    expect(isValidEmail(" a@b.co ")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(otpChannel({ email: "a@b.co", phone: "+24107000001" })?.kind).toBe("email");
    expect(otpChannel({ phone: "+24107000001" })?.kind).toBe("phone");
    expect(otpChannel({})).toBeNull();
  });
});

describe("C-03 Adresse e-mail", () => {
  it("envoie le code à l'adresse normalisée et navigue vers C-04", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<Email />);
    await user.type(screen.getByTestId("email-input"), "Invitee@Example.com");
    await user.press(screen.getByTestId("email-send"));
    expect(mockSignIn).toHaveBeenCalledWith({}, "invitee@example.com");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(auth)/otp",
      params: { email: "invitee@example.com" },
    });
  });

  it("adresse invalide : erreur explicite, aucun envoi", async () => {
    const user = userEvent.setup();
    render(<Email />);
    await user.type(screen.getByTestId("email-input"), "pas-une-adresse");
    await user.press(screen.getByTestId("email-send"));
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(screen.getByText("Adresse e-mail invalide.")).toBeOnTheScreen();
  });

  it("garde un accès secondaire à la connexion par numéro", async () => {
    const user = userEvent.setup();
    render(<Email />);
    await user.press(screen.getByTestId("email-use-phone"));
    expect(mockPush).toHaveBeenCalledWith("/(auth)/phone");
  });
});
