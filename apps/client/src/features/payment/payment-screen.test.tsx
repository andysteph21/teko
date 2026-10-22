// C-15 : espèces (consigne + Continuer → C-16), Airtel en attente (push
// USSD), échec (renvoyer le push / repli espèces jamais une impasse),
// succès (bascule automatique vers l'évaluation).

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatXaf } from "@teko/core";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";

const mockGetRide = jest.fn();
const mockListPayments = jest.fn();
const mockGetPayment = jest.fn();
const mockInvokeCollect = jest.fn();
jest.mock("@teko/api-client", () => ({
  getRide: (...a: unknown[]) => mockGetRide(...a),
  listPaymentsForRide: (...a: unknown[]) => mockListPayments(...a),
  getPayment: (...a: unknown[]) => mockGetPayment(...a),
  invokeCollect: (...a: unknown[]) => mockInvokeCollect(...a),
  getProfile: jest.fn(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ rideId: "ride-1" }),
}));

jest.mock("../auth/use-session", () => ({
  useSession: () => ({
    session: { user: { id: "client-1", phone: "+24106123456" } },
    loading: false,
  }),
}));

import PaymentScreen from "../../../app/(main)/payment/[rideId]";

const ride = (surcharges: Record<string, unknown> = {}) => ({
  id: "ride-1",
  payment_method: "cash",
  price_final: "1500",
  price_est: 1200,
  category: "eco",
  origin_hint: "Pharmacie du Gros-Bouquet",
  dest_hint: "Lycée Léon Mba",
  started_at: null,
  completed_at: null,
  duration_est_s: 840,
  distance_est_m: 5200,
  driver_id: "driver-1",
  created_at: new Date().toISOString(),
  ...surcharges,
});

const paiement = (status: string) => ({
  id: "pay-1",
  kind: "ride_collection",
  status,
  partner_txn_id: "MP26082026T144600004471",
  provider_txn_id: null,
});

function renderScreen(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("C-15 espèces", () => {
  it("affiche le montant final et Continuer mène à l'évaluation", async () => {
    mockGetRide.mockResolvedValue(ride());
    const user = userEvent.setup();
    renderScreen(<PaymentScreen />);

    const montant = await screen.findByTestId("payment-amount");
    expect(montant).toHaveTextContent(formatXaf(1500, "FCFA"));
    expect(mockListPayments).not.toHaveBeenCalled();

    await user.press(screen.getByTestId("payment-continue"));
    expect(mockReplace).toHaveBeenCalledWith("/(main)/rating/ride-1");
  });
});

describe("C-15 Airtel Money", () => {
  it("en attente : push USSD envoyé au numéro de la session", async () => {
    mockGetRide.mockResolvedValue(ride({ payment_method: "airtel" }));
    mockListPayments.mockResolvedValue([paiement("pending")]);
    mockGetPayment.mockResolvedValue(paiement("pending"));
    renderScreen(<PaymentScreen />);

    expect(await screen.findByText(/Demande envoyée au \+241 06 12 34 56/)).toBeOnTheScreen();
    expect(screen.getByTestId("airtel-resend")).toBeOnTheScreen();
  });

  it("échec : renvoyer le push relance l'encaissement", async () => {
    mockGetRide.mockResolvedValue(ride({ payment_method: "airtel" }));
    mockListPayments.mockResolvedValue([paiement("failed")]);
    mockGetPayment.mockResolvedValue(paiement("failed"));
    mockInvokeCollect.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderScreen(<PaymentScreen />);

    expect(await screen.findByText("Échec du paiement")).toBeOnTheScreen();
    await user.press(screen.getByTestId("airtel-resend"));
    await waitFor(() => expect(mockInvokeCollect).toHaveBeenCalledWith({}, "pay-1"));
  });

  it("échec : le repli espèces bascule sur la consigne cash (jamais d'impasse)", async () => {
    mockGetRide.mockResolvedValue(ride({ payment_method: "airtel" }));
    mockListPayments.mockResolvedValue([paiement("failed")]);
    mockGetPayment.mockResolvedValue(paiement("failed"));
    const user = userEvent.setup();
    renderScreen(<PaymentScreen />);

    await user.press(await screen.findByTestId("pay-cash-alt"));
    expect(await screen.findByTestId("payment-continue")).toBeOnTheScreen();
    expect(screen.getByText(/^Remettez/)).toBeOnTheScreen();
  });

  it("succès : bascule automatique vers l'évaluation", async () => {
    mockGetRide.mockResolvedValue(ride({ payment_method: "airtel" }));
    mockListPayments.mockResolvedValue([paiement("success")]);
    mockGetPayment.mockResolvedValue(paiement("success"));
    renderScreen(<PaymentScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(main)/rating/ride-1"));
  });
});
