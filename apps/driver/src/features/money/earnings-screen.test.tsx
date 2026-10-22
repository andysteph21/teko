// D-17 : relevés par jour (puce de statut, lignes formatées, versement si
// présent), résumé de la semaine en tête (somme nette), état vide propre.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { businessDay, formatXaf } from "@teko/core";
import { render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

const mockListMyStatements = jest.fn();
jest.mock("@teko/api-client", () => ({
  listMyStatements: (...a: unknown[]) => mockListMyStatements(...a),
  driverBalance: jest.fn(),
  getMyDriver: jest.fn(),
  listMyLedger: jest.fn(),
  createSettlementPayment: jest.fn(),
  invokeCollect: jest.fn(),
  getPayment: jest.fn(),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: require("react-native").View,
}));

import EarningsScreen from "../../../app/(main)/earnings";

const AUJOURDHUI = businessDay(new Date());

// Numériques en chaînes, comme les sérialise supabase-js.
const releve = (surcharges: Record<string, unknown> = {}) => ({
  id: "st-1",
  driver_id: "driver-1",
  business_day: AUJOURDHUI,
  opening: "0",
  closing: "-1980",
  total_commission: "-1980",
  total_mobile_credit: "0",
  payout_amount: null,
  settled_amount: null,
  status: "open",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...surcharges,
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

describe("D-17 relevés", () => {
  it("journée en cours et journée versée : puces, lignes formatées, somme de la semaine", async () => {
    const hier = businessDay(new Date(Date.now() - 86_400_000));
    mockListMyStatements.mockResolvedValue([
      releve(),
      releve({
        id: "st-2",
        business_day: hier,
        closing: "9560",
        total_commission: "-1680",
        total_mobile_credit: "11240",
        payout_amount: "9560",
        status: "paid_out",
      }),
    ]);
    renderScreen(<EarningsScreen />);

    expect(await screen.findByTestId(`statement-${AUJOURDHUI}`)).toBeOnTheScreen();
    expect(screen.getByText("En cours")).toBeOnTheScreen();
    expect(screen.getByText("Versée")).toBeOnTheScreen();
    expect(screen.getByText("Versement")).toBeOnTheScreen();

    // Net du jour versé : 11 240 − 1 680 = +9 560 F.
    expect(screen.getByTestId(`statement-net-${hier}`)).toHaveTextContent(`+${formatXaf(9560)}`);
    // Semaine : (0 − 1 980) + 9 560 = 7 580 F.
    expect(screen.getByTestId("stat-week")).toHaveTextContent(formatXaf(7580));
    expect(screen.getByTestId("stat-days")).toHaveTextContent("2");
  });

  it("état vide propre avant la première clôture", async () => {
    mockListMyStatements.mockResolvedValue([]);
    renderScreen(<EarningsScreen />);

    expect(await screen.findByText("Aucun relevé pour l'instant")).toBeOnTheScreen();
    expect(
      screen.getByText("Vos journées apparaîtront ici après la première clôture de 04 h 00."),
    ).toBeOnTheScreen();
  });
});
