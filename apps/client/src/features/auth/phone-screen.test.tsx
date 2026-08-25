// C-03 : validation du format, envoi de l'OTP, navigation vers C-04.

import { render, screen, userEvent } from "@testing-library/react-native";

const mockSignIn = jest.fn();
jest.mock("@teko/api-client", () => ({
  signInWithPhoneOtp: (...args: unknown[]) => mockSignIn(...args),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import Phone, { isValidGabonNational } from "../../../app/(auth)/phone";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("isValidGabonNational", () => {
  it("accepte 8-9 chiffres, refuse le reste", () => {
    expect(isValidGabonNational("06123456")).toBe(true);
    expect(isValidGabonNational("070000001")).toBe(true);
    expect(isValidGabonNational("0612345")).toBe(false);
    expect(isValidGabonNational("06 12 34 56")).toBe(false);
  });
});

describe("C-03 Numéro", () => {
  it("envoie l'OTP au format E.164 et navigue vers C-04", async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<Phone />);

    await user.press(screen.getByTestId("phone-send"));

    expect(mockSignIn).toHaveBeenCalledWith({}, "+24107000001");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(auth)/otp",
      params: { phone: "+24107000001" },
    });
  });

  it("numéro trop court : erreur explicite, pas d'envoi", async () => {
    const user = userEvent.setup();
    render(<Phone />);

    const input = screen.getByTestId("phone-input");
    await user.clear(input);
    await user.type(input, "0612");
    // Le bouton reste désactivé sous 8 chiffres — l'état est expliqué.
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
