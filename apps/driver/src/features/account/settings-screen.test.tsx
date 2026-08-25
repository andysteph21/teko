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
const mockDriverBalance = jest.fn();
const mockRequestDeletion = jest.fn();
const mockSignOut = jest.fn();
jest.mock("@teko/api-client", () => ({
  getMyDriver: (...args: unknown[]) => mockGetMyDriver(...args),
  setGpsConsent: (...args: unknown[]) => mockSetGpsConsent(...args),
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
  mockGetMyDriver.mockResolvedValue({ id: "u1", gps_consent: true, categories: ["eco"] });
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
