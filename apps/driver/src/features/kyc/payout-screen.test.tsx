// D-07 versements 4/4 : numéro Airtel pré-rempli depuis le compte,
// enregistrement en E.164 puis passage à la vérification.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

const mockSetPayout = jest.fn();
jest.mock("@teko/api-client", () => ({
  setPayoutMsisdn: (...args: unknown[]) => mockSetPayout(...args),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({
    session: { user: { id: "u1", phone: "24107000002" } },
    loading: false,
  }),
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

import Payout, { nationalFromAccount } from "../../../app/(auth)/payout";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("nationalFromAccount", () => {
  it("retire l'indicatif +241 sous ses deux formes", () => {
    expect(nationalFromAccount("24107000002")).toBe("07000002");
    expect(nationalFromAccount("+24107894512")).toBe("07894512");
    expect(nationalFromAccount(undefined)).toBe("");
  });
});

describe("D-07 Versements", () => {
  it("pré-remplit le numéro du compte et l'enregistre en E.164", async () => {
    mockSetPayout.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<Payout />);

    expect(screen.getByTestId("payout-msisdn").props.value).toBe("07000002");
    await user.press(screen.getByTestId("payout-finish"));

    await waitFor(() => expect(mockSetPayout).toHaveBeenCalledWith({}, "u1", "+24107000002"));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/verification");
  });

  it("numéro modifiable : le nouveau numéro est enregistré", async () => {
    mockSetPayout.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<Payout />);

    const input = screen.getByTestId("payout-msisdn");
    await user.clear(input);
    await user.type(input, "07894512");
    await user.press(screen.getByTestId("payout-finish"));

    await waitFor(() => expect(mockSetPayout).toHaveBeenCalledWith({}, "u1", "+24107894512"));
  });
});
