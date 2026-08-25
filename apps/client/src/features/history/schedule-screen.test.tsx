// C-18 : choix jour + créneau → scheduledAt dans le brouillon → recherche.

import { screen, userEvent } from "@testing-library/react-native";

jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import { render } from "@testing-library/react-native";
import Schedule from "../../../app/(main)/schedule";
import { useBookingStore } from "../booking/store";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.setState({ scheduledAt: null });
});

describe("C-18 Planifier", () => {
  it("affiche jours, note d'information et CTA", () => {
    render(<Schedule />);

    expect(screen.getByText("Planifier une course")).toBeOnTheScreen();
    expect(screen.getByText("Demain")).toBeOnTheScreen();
    expect(screen.getByText(/recherché environ 15 minutes avant/)).toBeOnTheScreen();
    expect(screen.getByTestId("schedule-cta")).toBeOnTheScreen();
  });

  it("demain 05 h 30 → scheduledAt ISO posé et flux de commande poursuivi", async () => {
    const user = userEvent.setup();
    render(<Schedule />);

    await user.press(screen.getByTestId("day-1"));
    await user.press(screen.getByTestId("slot-0530"));
    await user.press(screen.getByTestId("schedule-cta"));

    const iso = useBookingStore.getState().scheduledAt;
    expect(iso).not.toBeNull();
    const when = new Date(iso as string);
    expect(when.getHours()).toBe(5);
    expect(when.getMinutes()).toBe(30);
    expect(when.getTime()).toBeGreaterThan(Date.now());
    expect(mockPush).toHaveBeenCalledWith("/(main)/search");
  });
});
