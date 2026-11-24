// R5 — écran Livraison : service fermé → « Service bientôt disponible » ;
// ouvert → véhicule voiture/moto à prix ferme, formulaire colis, commande
// (request_delivery) puis recherche d'un coursier.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

const mockQuote = jest.fn();
const mockRequestDelivery = jest.fn();
jest.mock("@teko/api-client", () => ({
  ...jest.requireActual("@teko/api-client"),
  getRideQuote: (...args: unknown[]) => mockQuote(...args),
  requestDelivery: (...args: unknown[]) => mockRequestDelivery(...args),
  setRideClientPosition: jest.fn(),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: "denied" })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require("react-native").View,
}));

const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockRedirect = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
    dismissTo: mockDismissTo,
  }),
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

import { TekoApiError } from "@teko/api-client";
import Delivery from "../../../app/(main)/delivery";
import { useBookingStore } from "./store";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const SHAPE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
const quoteFor = (category: string, price: number) => ({
  id: `q-${category}`,
  category,
  price,
  service_type: "delivery",
  route_shape: SHAPE,
  distance_m: 3000,
  duration_s: 600,
});

function renderDelivery() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <Delivery />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useBookingStore.setState({
    service: "delivery",
    origin: { position: { lon: 9.45, lat: 0.4 }, label: "Ma position" },
    destination: { position: { lon: 9.47, lat: 0.41 }, label: "Marché", landmarkId: "lm-1" },
  });
  mockQuote.mockImplementation(async (_c: unknown, input: { category: string }) =>
    quoteFor(input.category, input.category === "moto" ? 775 : 1150),
  );
});

describe("R5 Livraison", () => {
  it("sans départ ni destination, retourne à l'accueil", () => {
    useBookingStore.getState().reset();
    renderDelivery();
    expect(mockRedirect).toHaveBeenCalledWith("/(main)/home");
  });

  it("service fermé : « Service bientôt disponible », aucun formulaire", async () => {
    mockQuote.mockRejectedValue(new TekoApiError("service_closed", "SERVICE_CLOSED"));
    const user = userEvent.setup();
    renderDelivery();
    expect(await screen.findByText("Service bientôt disponible")).toBeOnTheScreen();
    expect(screen.queryByTestId("delivery-submit")).toBeNull();
    await user.press(screen.getByTestId("delivery-home"));
    expect(useBookingStore.getState().service).toBe("ride");
    expect(mockDismissTo).toHaveBeenCalledWith("/(main)/home");
  });

  it("devis livraison voiture et moto, puis commande avec le colis", async () => {
    mockRequestDelivery.mockResolvedValue({ id: "ride-9", service_type: "delivery" });
    const user = userEvent.setup();
    renderDelivery();

    expect(await screen.findByTestId("delivery-vehicle-eco")).toHaveTextContent(/Voiture · 1.150/);
    expect(screen.getByTestId("delivery-vehicle-moto")).toHaveTextContent(/Moto · 775/);
    expect(mockQuote).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ category: "moto", service: "delivery" }),
    );
    expect(screen.getByTestId("delivery-submit")).toBeDisabled();

    await user.press(screen.getByTestId("delivery-vehicle-moto"));
    await user.type(screen.getByTestId("parcel-description"), "Documents");
    await user.press(screen.getByTestId("parcel-size-large"));
    await user.type(screen.getByTestId("parcel-recipient-name"), "Awa");
    await user.type(screen.getByTestId("parcel-recipient-phone"), "12");
    expect(screen.getByText("Saisissez un numéro de 8 à 15 chiffres.")).toBeOnTheScreen();
    expect(screen.getByTestId("delivery-submit")).toBeDisabled();
    await user.type(screen.getByTestId("parcel-recipient-phone"), "345678");

    expect(screen.getByTestId("delivery-submit")).toHaveTextContent(/Envoyer le colis · 775/);
    await user.press(screen.getByTestId("delivery-submit"));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/(main)/searching",
        params: { rideId: "ride-9" },
      }),
    );
    expect(mockRequestDelivery).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        quoteId: "q-moto",
        destinationLandmarkId: "lm-1",
        parcel: {
          description: "Documents",
          size: "large",
          recipientName: "Awa",
          recipientPhone: "12345678",
        },
      }),
    );
    expect(useBookingStore.getState().deliveryPrice).toBe(775);
  });

  it("refus serveur : message français par code, sans quitter l'écran", async () => {
    mockRequestDelivery.mockRejectedValue(new TekoApiError("fees_due", "frais"));
    const user = userEvent.setup();
    renderDelivery();
    await screen.findByTestId("delivery-vehicle-eco");
    await user.type(screen.getByTestId("parcel-description"), "Documents");
    await user.type(screen.getByTestId("parcel-recipient-name"), "Awa");
    await user.type(screen.getByTestId("parcel-recipient-phone"), "07712345");
    await user.press(screen.getByTestId("delivery-submit"));
    expect(await screen.findByTestId("delivery-error")).toHaveTextContent(/frais d’annulation/);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
