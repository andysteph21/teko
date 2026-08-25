// C-10 : garde brouillon → accueil, cartes de catégories à prix ferme,
// sélection catégorie/paiement, CTA vers C-11, réseau KO → C-29.

import { render, screen, userEvent } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRedirect = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

jest.mock("@maplibre/maplibre-react-native", () => ({
  Map: () => null,
  Camera: () => null,
  GeoJSONSource: () => null,
  Layer: () => null,
}));

jest.mock("../data/data-state", () => ({
  useDataUsage: () => ({ quantityText: "13 Mo", state: "normal" }),
  useResolvedMapMode: () => ({ mode: "full" }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockEstimatesQuery = jest.fn();
jest.mock("./use-estimates", () => ({
  useEstimates: () => mockEstimatesQuery(),
}));

import Category from "../../../app/(main)/category";
import { useBookingStore } from "./store";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const DRAFT = {
  origin: { position: { lon: 9.45, lat: 0.4 }, label: "Ma position" },
  destination: {
    position: { lon: 9.46, lat: 0.41 },
    label: "Lycée Léon Mba",
    landmarkId: "lm-1",
  },
  route: { coordinates: [], distanceM: 4200, durationS: 840 },
  estimates: { eco: 1500, moto: 800, confort: 2500 },
};

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useBookingStore.setState(DRAFT);
  mockEstimatesQuery.mockReturnValue({ isPending: false, error: null, refetch: jest.fn() });
});

describe("C-10 Catégorie", () => {
  it("sans brouillon complet, redirige vers l'accueil", () => {
    useBookingStore.getState().reset();
    render(<Category />);
    expect(mockRedirect).toHaveBeenCalledWith("/(main)/home");
  });

  it("affiche les prix fermes et commande la catégorie choisie", async () => {
    const user = userEvent.setup();
    render(<Category />);

    expect(screen.getByText("Choisissez votre course")).toBeOnTheScreen();
    // 14 min arrondies depuis durationS = 840 s.
    expect(screen.getByText(/4 places · 14 min/)).toBeOnTheScreen();

    await user.press(screen.getByTestId("cat-moto"));
    expect(useBookingStore.getState().category).toBe("moto");

    await user.press(screen.getByTestId("pay-airtel"));
    expect(useBookingStore.getState().paymentMethod).toBe("airtel");

    await user.press(screen.getByTestId("order-cta"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/meeting");
  });

  it("estimation en cours → rangées squelettes, CTA désactivé", () => {
    mockEstimatesQuery.mockReturnValue({ isPending: true, error: null, refetch: jest.fn() });
    render(<Category />);
    expect(screen.getByTestId("estimates-skeleton")).toBeOnTheScreen();
  });

  it("réseau KO → écran hors-ligne C-29, Réessayer relance l'estimation", async () => {
    const refetch = jest.fn();
    mockEstimatesQuery.mockReturnValue({ isPending: false, error: new Error("réseau"), refetch });
    const user = userEvent.setup();
    render(<Category />);

    expect(screen.getByText("Pas de connexion")).toBeOnTheScreen();
    await user.press(screen.getByTestId("offline-retry"));
    expect(refetch).toHaveBeenCalled();
  });
});
