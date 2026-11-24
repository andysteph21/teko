// C-05 : prénom et numéro requis ; le numéro part au serveur en E.164.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

const mockUpdateProfile = jest.fn(async (..._args: unknown[]) => undefined);
const mockUpdatePhone = jest.fn(async (..._args: unknown[]) => "24107123456");
jest.mock("@teko/api-client", () => ({
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  updateContactPhone: (...args: unknown[]) => mockUpdatePhone(...args),
  signInWithEmailOtp: jest.fn(),
  signInWithPhoneOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
  verifyPhoneOtp: jest.fn(),
}));
jest.mock("../../lib/supabase", () => ({
  supabase: { auth: { getUser: jest.fn(async () => ({ data: { user: { id: "u1" } } })) } },
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

import ProfileSetup from "../../../app/(auth)/profile-setup";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("C-05 Profil", () => {
  it("exige le numéro puis enregistre le prénom et le numéro déclaré", async () => {
    const user = userEvent.setup();
    render(<ProfileSetup />);
    await user.type(screen.getByTestId("profile-firstname"), "Awa");
    expect(screen.getByTestId("profile-continue").props.accessibilityState?.disabled).toBe(true);
    await user.type(screen.getByTestId("profile-phone"), "07 12 34 56");
    await user.press(screen.getByTestId("profile-continue"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(auth)/location"));
    expect(mockUpdateProfile).toHaveBeenCalledWith(expect.anything(), "u1", { fullName: "Awa" });
    expect(mockUpdatePhone).toHaveBeenCalledWith(expect.anything(), "+24107123456");
  });
});
