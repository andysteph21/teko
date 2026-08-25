// D-03 code OTP : après vérification, pas de fiche chauffeur → D-04
// identité ; fiche existante → splash (qui route selon l'état du dossier).

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockVerify = jest.fn();
const mockGetMyDriver = jest.fn();
jest.mock("@teko/api-client", () => ({
  verifyPhoneOtp: (...args: unknown[]) => mockVerify(...args),
  getMyDriver: (...args: unknown[]) => mockGetMyDriver(...args),
  signInWithPhoneOtp: jest.fn(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ phone: "+24107000002" }),
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

import Otp from "../../../app/(auth)/otp";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("D-03 Code OTP chauffeur", () => {
  it("nouveau chauffeur (pas de fiche) → D-04 identité", async () => {
    mockVerify.mockResolvedValueOnce({ user: { id: "u1" } });
    mockGetMyDriver.mockResolvedValueOnce(null);
    render(<Otp />);

    fireEvent.changeText(screen.getByTestId("otp-input"), "123456");

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(auth)/identity"));
    expect(mockVerify).toHaveBeenCalledWith({}, "+24107000002", "123456");
    expect(mockGetMyDriver).toHaveBeenCalledWith({}, "u1");
  });

  it("fiche chauffeur existante → retour au splash", async () => {
    mockVerify.mockResolvedValueOnce({ user: { id: "u1" } });
    mockGetMyDriver.mockResolvedValueOnce({ id: "u1", kyc_status: "pending" });
    render(<Otp />);

    fireEvent.changeText(screen.getByTestId("otp-input"), "123456");

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });
});
