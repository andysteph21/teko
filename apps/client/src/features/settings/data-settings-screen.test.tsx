// C-25 : consommation affichée vs budget, sélecteur trois états branché sur
// useMapModeStore et état résolu affiché dessous.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({
      type: "cellular",
      details: { cellularGeneration: "2g" },
    })),
  },
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

import DataSettings from "../../../app/(main)/data-settings";
import { useMapModeStore } from "../data/data-state";
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
});

describe("C-25 Données & mode éco", () => {
  it("affiche la consommation, le budget et les seuils", async () => {
    render(<DataSettings />, { wrapper: Providers });

    expect(screen.getByTestId("data-used")).toBeOnTheScreen();
    expect(screen.getByText(/budget 100 Mo/)).toBeOnTheScreen();
    expect(screen.getByText(/alerte à 50 Mo, en critique à 80 Mo/)).toBeOnTheScreen();
    // Auto sur réseau 2G → résolu éco, raison affichable telle quelle.
    await waitFor(() => expect(screen.getByTestId("mode-resolved")).toHaveTextContent("Auto → éco"));
  });

  it("choisir « Complet » met à jour la préférence et l'état résolu", async () => {
    const user = userEvent.setup();
    render(<DataSettings />, { wrapper: Providers });

    await user.press(screen.getByTestId("mode-complet"));

    expect(useMapModeStore.getState().preference).toBe("complet");
    await waitFor(() =>
      expect(screen.getByTestId("mode-resolved")).toHaveTextContent("Complet → complet"),
    );
  });
});
