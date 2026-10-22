// D-16 : montant pré-rempli avec la dette et modifiable, création de
// l'intention + push USSD, attente « validez sur votre téléphone Airtel »,
// succès (« Réglé » → retour solde), échec (renvoyer + règlement manuel).

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";

const mockDriverBalance = jest.fn();
const mockGetMyDriver = jest.fn();
const mockCreateSettlement = jest.fn();
const mockInvokeCollect = jest.fn();
const mockGetPayment = jest.fn();
jest.mock("@teko/api-client", () => ({
  driverBalance: (...a: unknown[]) => mockDriverBalance(...a),
  getMyDriver: (...a: unknown[]) => mockGetMyDriver(...a),
  createSettlementPayment: (...a: unknown[]) => mockCreateSettlement(...a),
  invokeCollect: (...a: unknown[]) => mockInvokeCollect(...a),
  getPayment: (...a: unknown[]) => mockGetPayment(...a),
  listMyLedger: jest.fn(),
  listMyStatements: jest.fn(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "driver-1" } }, loading: false }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require("react-native").View,
}));

import SettlementScreen, { DeferredAirtelSettlementScreen } from "../../../app/(main)/settlement";

const paiement = (status: string) => ({
  id: "pay-1",
  amount: "3000",
  kind: "driver_settlement",
  status,
  partner_txn_id: "TS26082026T020000001",
});

function renderScreen(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false, gcTime: Number.POSITIVE_INFINITY },
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

beforeEach(() => {
  jest.clearAllMocks();
  mockDriverBalance.mockResolvedValue(-3000);
  mockGetMyDriver.mockResolvedValue({ id: "driver-1", payout_msisdn: "+24107894512" });
});

describe("D-16 règlement Airtel", () => {
  it("dette pré-remplie → intention + push → attente au numéro de versement → succès → retour solde", async () => {
    mockCreateSettlement.mockResolvedValue(paiement("initiated"));
    mockInvokeCollect.mockResolvedValue(undefined);
    mockGetPayment.mockResolvedValue(paiement("success"));
    const user = userEvent.setup();
    renderScreen(<DeferredAirtelSettlementScreen />);

    // Pré-rempli avec la dette (solde −3 000 → 3 000), modifiable.
    await waitFor(() => expect(screen.getByTestId("settle-amount").props.value).toBe("3000"));

    await user.press(screen.getByTestId("settle-submit"));
    await waitFor(() => expect(mockCreateSettlement).toHaveBeenCalledWith({}, 3000));
    expect(mockInvokeCollect).toHaveBeenCalledWith({}, "pay-1");

    // Poll getPayment → success → « Réglé » ; la réactivation est backend.
    expect(await screen.findByTestId("settle-success")).toBeOnTheScreen();
    expect(screen.getByText("Réglé — vous êtes de nouveau en règle")).toBeOnTheScreen();

    await user.press(screen.getByTestId("settle-back"));
    expect(mockReplace).toHaveBeenCalledWith("/(main)/balance");
  });

  it("dette non entière : pré-remplie arrondie au franc supérieur (712.5 → 713, jamais 7125)", async () => {
    mockDriverBalance.mockResolvedValue(-712.5);
    renderScreen(<DeferredAirtelSettlementScreen />);
    await waitFor(() => expect(screen.getByTestId("settle-amount").props.value).toBe("713"));
  });

  it("montant modifié : l'intention part avec la saisie du chauffeur", async () => {
    mockCreateSettlement.mockResolvedValue(paiement("initiated"));
    mockInvokeCollect.mockResolvedValue(undefined);
    mockGetPayment.mockResolvedValue(paiement("pending"));
    const user = userEvent.setup();
    renderScreen(<DeferredAirtelSettlementScreen />);

    const champ = await screen.findByTestId("settle-amount");
    await user.clear(champ);
    await user.type(champ, "500");
    await user.press(screen.getByTestId("settle-submit"));

    await waitFor(() => expect(mockCreateSettlement).toHaveBeenCalledWith({}, 500));
    // En attente : consigne « validez sur votre téléphone Airtel ».
    expect(await screen.findByText(/Demande envoyée au \+241 07 89 45 12/)).toBeOnTheScreen();
  });

  it("échec : renvoyer la demande relance le push, le règlement manuel est proposé", async () => {
    mockCreateSettlement.mockResolvedValue(paiement("initiated"));
    mockInvokeCollect.mockResolvedValue(undefined);
    mockGetPayment.mockResolvedValue(paiement("failed"));
    const user = userEvent.setup();
    renderScreen(<DeferredAirtelSettlementScreen />);

    // Le CTA reste désactivé tant que la dette n'est pas chargée.
    await waitFor(() => expect(screen.getByTestId("settle-amount").props.value).toBe("3000"));
    await user.press(screen.getByTestId("settle-submit"));

    expect(await screen.findByText("Le règlement n'a pas abouti")).toBeOnTheScreen();
    expect(screen.getByTestId("settle-manual")).toBeOnTheScreen();

    await user.press(screen.getByTestId("settle-resend"));
    await waitFor(() => expect(mockInvokeCollect).toHaveBeenCalledTimes(2));
    expect(mockInvokeCollect).toHaveBeenLastCalledWith({}, "pay-1");
  });
});

it("l'écran alpha utilise le circuit manuel, actualise le vrai solde et ne déclenche aucun paiement Airtel", async () => {
  mockDriverBalance.mockResolvedValue(-3000);
  renderScreen(<SettlementScreen />);
  await waitFor(() =>
    expect(screen.getByTestId("settle-amount-display")).toHaveTextContent(/^3\s000\sFCFA$/),
  );
  expect(screen.getByText("Règlement manuel de l’alpha")).toBeOnTheScreen();
  expect(mockCreateSettlement).not.toHaveBeenCalled();
  expect(mockInvokeCollect).not.toHaveBeenCalled();
  mockDriverBalance.mockResolvedValue(0);
  await userEvent.setup().press(screen.getByTestId("settle-refresh"));
  await waitFor(() =>
    expect(screen.getByTestId("settle-amount-display")).toHaveTextContent(/^0\sFCFA$/),
  );
});
