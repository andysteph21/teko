// D-20 : groupement par jour avec total brut en tête de section, montant
// brut + sous-ligne commission, puces d'état, filtre Annulées, état vide.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { render, screen, userEvent } from "@testing-library/react-native";

const mockListMyRides = jest.fn();
jest.mock("@teko/api-client", () => ({
  listMyRides: (...args: unknown[]) => mockListMyRides(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

import History from "../../../app/(main)/history";
import { Providers } from "./test-wrapper";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

function ride(over: Partial<RideRow>): RideRow {
  return {
    id: "r1",
    status: "completed",
    category: "eco",
    created_at: new Date().toISOString(),
    scheduled_at: null,
    started_at: null,
    completed_at: null,
    origin_hint: null,
    dest_hint: null,
    price_est: null,
    price_final: null,
    payment_method: null,
    ...over,
  } as RideRow;
}

function fixtures(): RideRow[] {
  const yesterday = new Date(Date.now() - 86_400_000);
  return [
    ride({
      id: "a",
      origin_hint: "Mont-Bouët",
      dest_hint: "Pharmacie de Nkembo",
      price_final: "1200" as never,
      payment_method: "cash",
    }),
    ride({ id: "b", status: "enroute", price_est: "2200" as never }),
    ride({ id: "c", status: "cancelled_client", created_at: yesterday.toISOString() }),
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListMyRides.mockResolvedValue(fixtures());
});

describe("D-20 Historique des courses", () => {
  it("groupe par jour, total brut du jour, montant + commission, puces", async () => {
    render(<History />, { wrapper: Providers });

    expect(await screen.findByText("Mont-Bouët → Pharmacie de Nkembo")).toBeOnTheScreen();
    expect(screen.getByText("Aujourd'hui · 2 courses")).toBeOnTheScreen();
    expect(screen.getByText("Hier · 1 course")).toBeOnTheScreen();
    // Total du jour = brut des terminées uniquement.
    expect(screen.getAllByText(`+${formatXaf(1200, "F")}`).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("commission déduite au solde")).toBeOnTheScreen();
    expect(screen.getByText(`≈${formatXaf(2200, "F")}`)).toBeOnTheScreen();
    expect(screen.getByText("Terminée")).toBeOnTheScreen();
    expect(screen.getByText("En cours")).toBeOnTheScreen();
    expect(screen.getByText("Annulée")).toBeOnTheScreen();
    expect(mockListMyRides).toHaveBeenCalledWith({}, 50);
  });

  it("filtre « Annulées » : seules les courses annulées restent", async () => {
    const user = userEvent.setup();
    render(<History />, { wrapper: Providers });
    await screen.findByText("Mont-Bouët → Pharmacie de Nkembo");

    await user.press(screen.getByTestId("filter-annulees"));

    expect(screen.queryByText("Mont-Bouët → Pharmacie de Nkembo")).toBeNull();
    expect(screen.getByText("Annulée")).toBeOnTheScreen();
  });

  it("état vide quand aucune course", async () => {
    mockListMyRides.mockResolvedValue([]);
    render(<History />, { wrapper: Providers });

    expect(await screen.findByText("Aucune course pour le moment")).toBeOnTheScreen();
  });
});
