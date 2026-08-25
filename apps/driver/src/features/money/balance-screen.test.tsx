// D-15 : urgence (carte rouge, compte à rebours, règlement à un tap),
// suspendu (jamais un écran mort — montant dû + CTA), créditeur (pas de
// CTA), et libellés français des mouvements du grand livre.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatXaf } from "@teko/core";
import { render, screen, userEvent } from "@testing-library/react-native";
import type { ReactElement } from "react";

// isBalanceUrgent pilotable (l'urgence dépend sinon de l'horloge réelle).
let mockUrgent = false;
jest.mock("@teko/core", () => ({
  ...jest.requireActual("@teko/core"),
  isBalanceUrgent: () => mockUrgent,
}));

const mockDriverBalance = jest.fn();
const mockGetMyDriver = jest.fn();
const mockListMyLedger = jest.fn();
jest.mock("@teko/api-client", () => ({
  driverBalance: (...a: unknown[]) => mockDriverBalance(...a),
  getMyDriver: (...a: unknown[]) => mockGetMyDriver(...a),
  listMyLedger: (...a: unknown[]) => mockListMyLedger(...a),
  createSettlementPayment: jest.fn(),
  invokeCollect: jest.fn(),
  getPayment: jest.fn(),
  listMyStatements: jest.fn(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "driver-1" } }, loading: false }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require("react-native").View,
}));

import { businessDay } from "@teko/core";
import BalanceScreen from "../../../app/(main)/balance";

const chauffeur = (surcharges: Record<string, unknown> = {}) => ({
  id: "driver-1",
  is_active: true,
  kyc_status: "validated",
  payout_msisdn: "+24107894512",
  ...surcharges,
});

const ecriture = (surcharges: Record<string, unknown> = {}) => ({
  id: 1,
  driver_id: "driver-1",
  kind: "commission_due",
  amount_signed: "-180",
  balance_after: "-180",
  business_day: businessDay(new Date()),
  created_at: new Date().toISOString(),
  payment_id: null,
  ride_id: "ride-1",
  ...surcharges,
});

function renderScreen(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
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
  mockUrgent = false;
  mockGetMyDriver.mockResolvedValue(chauffeur());
  mockListMyLedger.mockResolvedValue([]);
});

describe("D-15 urgence", () => {
  it("carte rouge, montant « − » typographique, mouvements traduits, règlement à un tap", async () => {
    mockUrgent = true;
    mockDriverBalance.mockResolvedValue(-3000);
    mockListMyLedger.mockResolvedValue([
      ecriture(),
      ecriture({ id: 2, kind: "mobile_credit", amount_signed: "1870" }),
    ]);
    const user = userEvent.setup();
    renderScreen(<BalanceScreen />);

    expect(await screen.findByTestId("balance-card-urgence")).toBeOnTheScreen();
    expect(screen.getByTestId("balance-amount")).toHaveTextContent(formatXaf(-3000, "FCFA"));
    expect(screen.getByText("Vous devez à Teko")).toBeOnTheScreen();
    expect(screen.getByTestId("balance-countdown")).toBeOnTheScreen();
    expect(screen.getByText("Commission course")).toBeOnTheScreen();
    expect(screen.getByText("Course Airtel")).toBeOnTheScreen();
    expect(screen.getByTestId("ledger-amount-1")).toHaveTextContent(formatXaf(-180));

    await user.press(screen.getByTestId("settle-cta"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/settlement");
  });
});

describe("D-15 suspendu", () => {
  it("bloquant mais réversible : montant dû et CTA règlement présents", async () => {
    mockDriverBalance.mockResolvedValue(-4360);
    mockGetMyDriver.mockResolvedValue(chauffeur({ is_active: false }));
    renderScreen(<BalanceScreen />);

    expect(await screen.findByTestId("balance-card-suspendu")).toBeOnTheScreen();
    expect(screen.getByText("Compte suspendu")).toBeOnTheScreen();
    expect(screen.getByTestId("balance-amount")).toHaveTextContent(formatXaf(-4360, "FCFA"));
    expect(screen.getByTestId("settle-cta")).toBeOnTheScreen();
  });
});

describe("D-15 créditeur", () => {
  it("« Teko vous doit » en vert, sans CTA de règlement, état vide du livre", async () => {
    mockDriverBalance.mockResolvedValue(1870);
    renderScreen(<BalanceScreen />);

    expect(await screen.findByTestId("balance-card-crediteur")).toBeOnTheScreen();
    expect(screen.getByText("Teko vous doit")).toBeOnTheScreen();
    expect(screen.queryByTestId("settle-cta")).toBeNull();
    expect(screen.getByText("Aucun mouvement aujourd'hui.")).toBeOnTheScreen();
  });
});
