// C-22 : libellés français par type, sections par jour, tap = lu + navigation.

import { formatXaf } from "@teko/core";
import type { NotificationRow } from "@teko/types";
import { screen, userEvent, waitFor } from "@testing-library/react-native";

const mockList = jest.fn();
const mockMarkRead = jest.fn();
jest.mock("@teko/api-client", () => ({
  listNotifications: (...args: unknown[]) => mockList(...args),
  markNotificationRead: (...args: unknown[]) => mockMarkRead(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import Notifications from "../../../app/(main)/notifications";
import { renderWithQuery } from "./test-utils";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

function fixtures(): NotificationRow[] {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 11, 2);
  return [
    {
      id: "n1",
      user_id: "u1",
      type: "ride_completed",
      payload: { ride_id: "ride-9", price: 1500 },
      read_at: null,
      created_at: now.toISOString(),
    },
    {
      id: "n2",
      user_id: "u1",
      type: "landmark_accepted",
      payload: { name: "Boulangerie d'Akébé" },
      read_at: yesterday.toISOString(),
      created_at: yesterday.toISOString(),
    },
  ] as NotificationRow[];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue(fixtures());
  mockMarkRead.mockResolvedValue(undefined);
});

describe("C-22 Notifications", () => {
  it("affiche libellés français, montant et sections par jour", async () => {
    renderWithQuery(<Notifications />);

    expect(
      await screen.findByText(`Course terminée — ${formatXaf(1500, "FCFA")}`),
    ).toBeOnTheScreen();
    expect(screen.getByText("Repère accepté")).toBeOnTheScreen();
    expect(screen.getByText(/Boulangerie d'Akébé/)).toBeOnTheScreen();
    expect(screen.getByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText("Hier")).toBeOnTheScreen();
  });

  it("tap : pointe la notification lue et navigue vers la course", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Notifications />);
    await screen.findByTestId("notification-n1");

    await user.press(screen.getByTestId("notification-n1"));

    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith({}, "n1"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/ride/ride-9");
  });

  it("déjà lue : pas de pointage, navigation seulement si ride_id", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Notifications />);
    await screen.findByTestId("notification-n2");

    await user.press(screen.getByTestId("notification-n2"));

    expect(mockMarkRead).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
