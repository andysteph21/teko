// R5 — option « Envoyer un colis » de l'accueil : ouverture lue au choix de
// l'option ; fermé → « Service bientôt disponible », ouvert → recherche.

import { render, screen, userEvent } from "@testing-library/react-native";

const mockAvailability = jest.fn();
jest.mock("@teko/api-client", () => ({
  ...jest.requireActual("@teko/api-client"),
  serviceAvailability: (...args: unknown[]) => mockAvailability(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

import { DeliveryOption } from "./delivery-option";
import { useBookingStore } from "./store";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useBookingStore
    .getState()
    .setOrigin({ position: { lon: 9.45, lat: 0.4 }, label: "Ma position", source: "gps" });
});

describe("R5 option Livraison de l'accueil", () => {
  it("service fermé : « Service bientôt disponible », aucun parcours ouvert", async () => {
    mockAvailability.mockResolvedValue({ sharedRide: false, delivery: false });
    const user = userEvent.setup();
    render(<DeliveryOption />);
    await user.press(screen.getByTestId("home-delivery"));
    expect(await screen.findByText("Service bientôt disponible")).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
    expect(useBookingStore.getState().service).toBe("ride");
  });

  it("service ouvert : brouillon en livraison puis recherche de la destination", async () => {
    mockAvailability.mockResolvedValue({ sharedRide: false, delivery: true });
    const user = userEvent.setup();
    render(<DeliveryOption />);
    await user.press(screen.getByTestId("home-delivery"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/search");
    expect(useBookingStore.getState().service).toBe("delivery");
  });

  it("lecture impossible : le parcours s'ouvre, le vrai devis tranchera", async () => {
    mockAvailability.mockRejectedValue(new Error("réseau"));
    const user = userEvent.setup();
    render(<DeliveryOption />);
    await user.press(screen.getByTestId("home-delivery"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/search");
  });
});
