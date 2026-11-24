// Connexion Google : bouton de l'écran e-mail (affiché sur drapeau) et écran
// de retour qui échange le code contre la session.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

const mockUrl = jest.fn();
const mockComplete = jest.fn();
const mockLookup = jest.fn();
jest.mock("@teko/api-client", () => ({
  googleSignInUrl: (...args: unknown[]) => mockUrl(...args),
  completeOAuthSignIn: (...args: unknown[]) => mockComplete(...args),
  getProfile: (...args: unknown[]) => mockLookup(...args),
  signInWithEmailOtp: jest.fn(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../../config", () => ({ GOOGLE_LOGIN_ENABLED: true, PHONE_LOGIN_ENABLED: false }));
const mockOpen = jest.fn();
jest.mock("expo-linking", () => ({
  createURL: (path: string) => `teko-test://${path}`,
  openURL: (...args: unknown[]) => mockOpen(...args),
}));
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

import Email from "../../../app/(auth)/email";
import GoogleReturn from "../../../app/(auth)/google-return";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe("bouton Google de l'écran e-mail", () => {
  it("ouvre le navigateur sur l'adresse fournie par le serveur, retour vers l'app", async () => {
    mockUrl.mockResolvedValue("https://accounts.example/o");
    const user = userEvent.setup();
    render(<Email />);
    await user.press(screen.getByTestId("email-google"));
    expect(mockUrl).toHaveBeenCalledWith({}, "teko-test://auth");
    expect(mockOpen).toHaveBeenCalledWith("https://accounts.example/o");
  });

  it("service indisponible : message, le code par e-mail reste proposé", async () => {
    mockUrl.mockRejectedValue(new Error("fermé"));
    const user = userEvent.setup();
    render(<Email />);
    await user.press(screen.getByTestId("email-google"));
    expect(await screen.findByTestId("email-google-error")).toBeOnTheScreen();
    expect(screen.getByTestId("email-send")).toBeOnTheScreen();
  });
});

describe("écran de retour Google", () => {
  it("compte connu : session créée puis accueil", async () => {
    mockParams = { code: "abc" };
    mockComplete.mockResolvedValue({ user: { id: "u1" } });
    mockLookup.mockResolvedValue({ full_name: "Awa" });
    render(<GoogleReturn />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(mockComplete).toHaveBeenCalledWith({}, "app://auth?code=abc");
  });

  it("premier passage : suite du parcours d'inscription", async () => {
    mockParams = { code: "abc" };
    mockComplete.mockResolvedValue({ user: { id: "u1" } });
    mockLookup.mockResolvedValue({ full_name: null });
    render(<GoogleReturn />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(auth)/profile-setup"));
  });

  it("adresse non invitée ou refus : message et retour à la connexion", async () => {
    mockParams = { error: "access_denied" };
    mockComplete.mockRejectedValue(new Error("Invitation alpha requise"));
    const user = userEvent.setup();
    render(<GoogleReturn />);
    await user.press(await screen.findByTestId("google-return-back"));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/email");
  });

  it("retour sans code : traité comme un refus", async () => {
    mockComplete.mockResolvedValue(null);
    render(<GoogleReturn />);
    expect(await screen.findByTestId("google-return-error")).toBeOnTheScreen();
  });
});
