// D-03 : validation du format, envoi de l'OTP, navigation vers le code.

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
    expect(isValidGabonNational("07894512")).toBe(true);
    expect(isValidGabonNational("070000002")).toBe(true);
    expect(isValidGabonNational("0789451")).toBe(false);
    expect(isValidGabonNational("07 89 45 12")).toBe(false);
  });
});

describe("D-03 Numéro chauffeur", () => {
  it("envoie l'OTP au format E.164 (numéro test dev) et navigue vers le code", async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<Phone />);

    await user.press(screen.getByTestId("phone-send"));

    expect(mockSignIn).toHaveBeenCalledWith({}, "+24107000002");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(auth)/otp",
      params: { phone: "+24107000002" },
    });
  });

  it("numéro trop court : bouton désactivé, pas d'envoi", async () => {
    const user = userEvent.setup();
    render(<Phone />);

    const input = screen.getByTestId("phone-input");
    await user.clear(input);
    await user.type(input, "0789");
    await user.press(screen.getByTestId("phone-send"));

    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
