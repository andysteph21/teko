// C-10 : garde brouillon → accueil, cartes de catégories à prix ferme,
// sélection catégorie/paiement, CTA vers C-11, réseau KO → C-29.

import { TekoApiError } from "@teko/api-client";
import { render, screen, userEvent } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockRedirect = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, dismissTo: mockDismissTo }),
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

const mockSharedEstimate = jest.fn();
jest.mock("./use-shared-estimate", () => ({
  useSharedEstimate: () => mockSharedEstimate(),
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
  mockSharedEstimate.mockReturnValue({ available: false, updating: false });
});

describe("C-10 Covoiturage (R4)", () => {
  const SHARED_QUOTE = {
    id: "q-shared",
    category: "covoiturage",
    seats: 2,
    price: 1550,
    route_shape: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
    distance_m: 4200,
    duration_s: 840,
  };

  it("service fermé : aucune carte Covoiturage, aucune erreur", () => {
    render(<Category />);
    expect(screen.queryByTestId("cat-covoiturage")).toBeNull();
    expect(screen.getByTestId("cat-eco")).toBeOnTheScreen();
  });

  it("service ouvert : prix total, prix par place, places et avertissement", async () => {
    mockSharedEstimate.mockReturnValue({ available: true, updating: false });
    useBookingStore.setState({
      seats: 2,
      estimates: { ...DRAFT.estimates, covoiturage: 1550 },
      quotes: { covoiturage: SHARED_QUOTE as never },
    });
    const user = userEvent.setup();
    render(<Category />);

    expect(screen.getByText("Covoiturage")).toBeOnTheScreen();
    expect(screen.getByText(/775.*par place/)).toBeOnTheScreen();
    expect(screen.queryByTestId("shared-details")).toBeNull();

    await user.press(screen.getByTestId("cat-covoiturage"));
    expect(useBookingStore.getState().category).toBe("covoiturage");
    expect(screen.getByText(/d’autres passagers peuvent monter en route/)).toBeOnTheScreen();
    expect(screen.getByTestId("order-cta")).toHaveTextContent(/Commander Covoiturage · 1.550/);
    expect(screen.getByTestId("order-cta")).toBeEnabled();

    // Trois places demandées : la commande attend le devis de trois places.
    await user.press(screen.getByTestId("shared-seats-3"));
    expect(useBookingStore.getState().seats).toBe(3);
    expect(screen.getByTestId("order-cta")).toBeDisabled();
    expect(screen.queryByTestId("shared-seats-4")).toBeNull();
  });
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

    // Moto masquée pendant l'alpha (décision du 17 novembre 2026).
    expect(screen.queryByTestId("cat-moto")).toBeNull();
    await user.press(screen.getByTestId("cat-confort"));
    expect(useBookingStore.getState().category).toBe("confort");

    // Airtel Money masqué pour l'instant (payment-methods.ts) : seule la
    // pastille Espèces est proposée, déjà sélectionnée.
    expect(screen.queryByTestId("pay-airtel")).toBeNull();
    expect(screen.getByTestId("pay-cash").props.accessibilityState).toEqual({ selected: true });
    expect(useBookingStore.getState().paymentMethod).toBe("cash");

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
    mockEstimatesQuery.mockReturnValue({
      isPending: false,
      error: new TekoApiError("network", "réseau"),
      refetch,
    });
    const user = userEvent.setup();
    render(<Category />);

    expect(screen.getByText("Pas de connexion")).toBeOnTheScreen();
    await user.press(screen.getByTestId("offline-retry"));
    expect(refetch).toHaveBeenCalled();
  });

  it("une panne du service ne prétend pas que le téléphone est hors réseau", async () => {
    const refetch = jest.fn();
    mockEstimatesQuery.mockReturnValue({
      isPending: false,
      error: new Error("service indisponible"),
      refetch,
    });
    const user = userEvent.setup();
    render(<Category />);
    expect(screen.getByText("Tarifs temporairement indisponibles")).toBeOnTheScreen();
    expect(screen.queryByText("Pas de connexion")).toBeNull();
    expect(screen.queryByTestId("order-cta")).toBeNull();
    expect(refetch).not.toHaveBeenCalled();
    await user.press(screen.getByTestId("quote-retry"));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("un trajet invalide revient à la sélection sans relancer le même devis", async () => {
    const refetch = jest.fn();
    mockEstimatesQuery.mockReturnValue({
      isPending: false,
      error: new TekoApiError("quote_points_too_close", "POINTS_TOO_CLOSE"),
      refetch,
    });
    const user = userEvent.setup();
    render(<Category />);

    expect(screen.getByText("Départ et arrivée trop proches")).toBeOnTheScreen();
    expect(screen.queryByTestId("quote-retry")).toBeNull();
    expect(screen.queryByTestId("order-cta")).toBeNull();
    await user.press(screen.getByTestId("quote-edit"));
    expect(mockDismissTo).toHaveBeenCalledWith("/(main)/search");
    expect(refetch).not.toHaveBeenCalled();
  });
});
