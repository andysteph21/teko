// C-30 : français sélectionné (coche), autres langues grisées « Bientôt ».

import { render, screen } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

import Language from "../../../app/(main)/language";
import { Providers } from "./test-wrapper";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

describe("C-30 Langue", () => {
  it("français actif, English et langues locales annoncées « Bientôt »", () => {
    render(<Language />, { wrapper: Providers });

    expect(screen.getByText("Français")).toBeOnTheScreen();
    expect(screen.getByText("Langue actuelle")).toBeOnTheScreen();
    expect(screen.getByTestId("lang-fr")).toHaveAccessibilityState({ checked: true });
    expect(screen.getByTestId("lang-en")).toHaveAccessibilityState({
      checked: false,
      disabled: true,
    });
    expect(screen.getAllByText("Bientôt")).toHaveLength(2);
    expect(screen.getByText(/accueillir d'autres langues sans mise à jour majeure/)).toBeOnTheScreen();
  });
});
