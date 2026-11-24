// D-19 : consentement GPS branché sur setGpsConsent, suppression bloquée
// tant que le solde n'est pas à zéro (montant + route règlement D-16),
// suppression confirmée → request_account_deletion → signOut → racine.

import { formatXaf } from "@teko/core";
import { act, fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({
      type: "cellular",
      details: { cellularGeneration: "2g" },
    })),
  },
}));

const mockGetMyDriver = jest.fn();
const mockSetGpsConsent = jest.fn();
const mockSetSharedRides = jest.fn();
const mockSetDeliveryEnabled = jest.fn();
const mockDriverBalance = jest.fn();
const mockRequestDeletion = jest.fn();
const mockSignOut = jest.fn();
jest.mock("@teko/api-client", () => ({
  getMyDriver: (...args: unknown[]) => mockGetMyDriver(...args),
  setGpsConsent: (...args: unknown[]) => mockSetGpsConsent(...args),
  setSharedRides: (...args: unknown[]) => mockSetSharedRides(...args),
  setDeliveryEnabled: (...args: unknown[]) => mockSetDeliveryEnabled(...args),
  driverBalance: (...args: unknown[]) => mockDriverBalance(...args),
  requestAccountDeletion: (...args: unknown[]) => mockRequestDeletion(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
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

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

import Settings from "../../../app/(main)/settings";
import { useMapModeStore } from "./data-mode";
import { Providers } from "./test-wrapper";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  useMapModeStore.setState({ preference: "auto" });
  mockGetMyDriver.mockResolvedValue({
    id: "u1",
    gps_consent: true,
    categories: ["eco"],
    shared_enabled: true,
    delivery_enabled: false,
  });
  mockSetSharedRides.mockResolvedValue(false);
  mockSetDeliveryEnabled.mockResolvedValue(true);
  mockSetGpsConsent.mockResolvedValue(undefined);
  mockDriverBalance.mockResolvedValue(0);
  mockRequestDeletion.mockResolvedValue("2026-09-24T00:00:00Z");
  mockSignOut.mockResolvedValue(undefined);
});

describe("D-19 Paramètres", () => {
  it("consentement GPS : valeur du dossier puis bascule → setGpsConsent", async () => {
    render(<Settings />, { wrapper: Providers });
    const gpsSwitch = await screen.findByTestId("gps-switch");
    await waitFor(() => expect(gpsSwitch.props.value).toBe(true));

    await act(async () => {
      fireEvent(gpsSwitch, "valueChange", false);
    });

    await waitFor(() =>
      expect(mockSetGpsConsent).toHaveBeenCalledWith(expect.anything(), "u1", false),
    );
  });

  it("sélecteur éco 3 états présent + résolu « Auto → éco » sur 2G", async () => {
    render(<Settings />, { wrapper: Providers });

    expect(await screen.findByTestId("mode-eco")).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByTestId("mode-resolved")).toHaveTextContent(/Auto → éco/),
    );
  });

  it("suppression bloquée si solde non nul : montant + route règlement", async () => {
    mockDriverBalance.mockResolvedValue(-1500);
    const alertSpy = jest.spyOn(Alert, "alert");
    const user = userEvent.setup();
    render(<Settings />, { wrapper: Providers });
    await screen.findByTestId("gps-switch");
    await waitFor(() => expect(mockGetMyDriver).toHaveBeenCalled());

    await user.press(screen.getByTestId("settings-delete"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Solde à régler d'abord",
        expect.stringContaining(formatXaf(1500, "FCFA")),
        expect.anything(),
      ),
    );
    const buttons = alertSpy.mock.calls.at(-1)?.[2];
    await act(async () => {
      buttons?.[1]?.onPress?.();
    });
    expect(mockRequestDeletion).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/(main)/settlement");
  });

  it("solde à zéro : confirmation → suppression → signOut → racine", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const user = userEvent.setup();
    render(<Settings />, { wrapper: Providers });
    await screen.findByTestId("gps-switch");

    await user.press(screen.getByTestId("settings-delete"));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const buttons = alertSpy.mock.calls.at(-1)?.[2];
    await act(async () => {
      buttons?.[1]?.onPress?.();
    });

    await waitFor(() => expect(mockRequestDeletion).toHaveBeenCalled());
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });
});

describe("D-19 Services (lots R4 et R5)", () => {
  it("covoiturage reçu par défaut, livraison à activer : valeurs de la fiche puis bascules", async () => {
    render(<Settings />, { wrapper: Providers });
    const shared = await screen.findByTestId("shared-switch");
    const delivery = screen.getByTestId("delivery-switch");
    await waitFor(() => expect(shared.props.value).toBe(true));
    expect(delivery.props.value).toBe(false);

    await act(async () => {
      fireEvent(shared, "valueChange", false);
    });
    await waitFor(() => expect(mockSetSharedRides).toHaveBeenCalledWith(expect.anything(), false));
    await waitFor(() => expect(screen.getByTestId("shared-switch").props.value).toBe(false));

    await act(async () => {
      fireEvent(screen.getByTestId("delivery-switch"), "valueChange", true);
    });
    await waitFor(() =>
      expect(mockSetDeliveryEnabled).toHaveBeenCalledWith(expect.anything(), true),
    );
    await waitFor(() => expect(screen.getByTestId("delivery-switch").props.value).toBe(true));
  });

  it("refus du serveur : la bascule revient et le motif est dit (service fermé)", async () => {
    const { TekoApiError } = jest.requireMock("@teko/api-client");
    mockSetDeliveryEnabled.mockRejectedValue(new TekoApiError("service_closed"));
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<Settings />, { wrapper: Providers });
    const delivery = await screen.findByTestId("delivery-switch");
    await waitFor(() => expect(delivery.props.disabled).toBe(false));

    await act(async () => {
      fireEvent(delivery, "valueChange", true);
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Recevoir des livraisons",
        "Ce service n'est pas encore ouvert.",
      ),
    );
    expect(screen.getByTestId("delivery-switch").props.value).toBe(false);
  });

  it("moto seule : covoiturage indisponible, interrupteur inactif", async () => {
    mockGetMyDriver.mockResolvedValue({
      id: "u1",
      gps_consent: true,
      categories: ["moto"],
      shared_enabled: true,
      delivery_enabled: false,
    });
    render(<Settings />, { wrapper: Providers });
    expect(await screen.findByText("Réservé aux voitures.")).toBeOnTheScreen();
    expect(screen.getByTestId("shared-switch").props.value).toBe(false);
    expect(screen.getByTestId("shared-switch").props.disabled).toBe(true);
  });
});
