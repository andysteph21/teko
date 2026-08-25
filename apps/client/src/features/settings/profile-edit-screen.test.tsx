// C-24 : champs pré-remplis depuis le profil (full_name scindé), puis
// Enregistrer → updateProfile → retour.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

const mockGetProfile = jest.fn();
const mockUpdateProfile = jest.fn();
jest.mock("@teko/api-client", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  TekoApiError: class TekoApiError extends Error {
    code: string;
    constructor(code = "unknown", message = "") {
      super(message);
      this.code = code;
    }
  },
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

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

import ProfileEdit from "../../../app/(main)/profile-edit";
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
    email: "nadia.o@exemple.com",
  });
});

describe("C-24 Modifier le profil", () => {
  it("pré-remplit prénom / nom / e-mail depuis le profil", async () => {
    render(<ProfileEdit />, { wrapper: Providers });

    expect(await screen.findByDisplayValue("Nadia")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Obame")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("nadia.o@exemple.com")).toBeOnTheScreen();
    expect(screen.getByText(/\+241 06 12 34 56/)).toBeOnTheScreen();
  });

  it("Enregistrer : updateProfile avec full_name recomposé puis retour", async () => {
    mockUpdateProfile.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<ProfileEdit />, { wrapper: Providers });

    const first = await screen.findByTestId("edit-firstname");
    await user.clear(first);
    await user.type(first, "Awa");
    await user.press(screen.getByTestId("edit-save"));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.anything(), "u1", {
        fullName: "Awa Obame",
        email: "nadia.o@exemple.com",
      }),
    );
    expect(mockBack).toHaveBeenCalled();
  });
});
