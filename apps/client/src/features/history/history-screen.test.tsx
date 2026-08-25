// C-19 : groupement par jour, puces d'état, filtres, navigation détail.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { screen, userEvent } from "@testing-library/react-native";

const mockListMyRides = jest.fn();
jest.mock("@teko/api-client", () => ({
  listMyRides: (...args: unknown[]) => mockListMyRides(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import History from "../../../app/(main)/history";
import { renderWithQuery } from "./test-utils";

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
    distance_est_m: null,
    ...over,
  } as RideRow;
}

function fixtures(): RideRow[] {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 40);
  return [
    ride({
      id: "up",
      status: "requested",
      category: "confort",
      scheduled_at: tomorrow.toISOString(),
      origin_hint: "Gare routière",
      dest_hint: "Hôpital de Nkembo",
      price_est: "2500" as never,
    }),
    ride({
      id: "td",
      origin_hint: "Pharmacie du Gros-Bouquet",
      dest_hint: "Lycée Léon Mba",
      price_final: "1500" as never,
    }),
    ride({ id: "yd", status: "cancelled_client", created_at: yesterday.toISOString() }),
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListMyRides.mockResolvedValue(fixtures());
});

describe("C-19 Historique", () => {
  it("groupe par jour avec puce d'état et montant (≈ si estimation)", async () => {
    renderWithQuery(<History />);

    expect(await screen.findByText("Gare routière → Hôpital de Nkembo")).toBeOnTheScreen();
    expect(screen.getByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText("Hier")).toBeOnTheScreen();
    expect(screen.getByText("Planifiée")).toBeOnTheScreen();
    expect(screen.getByText("Terminée")).toBeOnTheScreen();
    expect(screen.getByText("Annulée")).toBeOnTheScreen();
    expect(screen.getByText(formatXaf(1500, "FCFA"))).toBeOnTheScreen();
    expect(screen.getByText(`≈${formatXaf(2500, "FCFA")}`)).toBeOnTheScreen();
    expect(mockListMyRides).toHaveBeenCalledWith({}, 50);
  });

  it("filtre « Annulées » : seules les courses annulées restent", async () => {
    const user = userEvent.setup();
    renderWithQuery(<History />);
    await screen.findByText("Pharmacie du Gros-Bouquet → Lycée Léon Mba");

    await user.press(screen.getByTestId("filter-annulees"));

    expect(screen.queryByText("Pharmacie du Gros-Bouquet → Lycée Léon Mba")).toBeNull();
    expect(screen.getByText("Annulée")).toBeOnTheScreen();
  });

  it("tap sur un trajet → détail C-20", async () => {
    const user = userEvent.setup();
    renderWithQuery(<History />);
    await screen.findByTestId("ride-td");

    await user.press(screen.getByTestId("ride-td"));

    expect(mockPush).toHaveBeenCalledWith("/(main)/history/td");
  });
});
