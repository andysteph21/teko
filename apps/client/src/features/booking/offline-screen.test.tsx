// C-29 : rendu calme (titre + astuce, pas de spinner) et bouton Réessayer.

import { render, screen, userEvent } from "@testing-library/react-native";
import { OfflineScreen } from "../../components/offline-screen";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

describe("C-29 Hors-ligne", () => {
  it("affiche le message rassurant et l'astuce mode éco", () => {
    render(<OfflineScreen onRetry={jest.fn()} />);
    expect(screen.getByText("Pas de connexion")).toBeOnTheScreen();
    expect(screen.getByText(/mode éco fonctionne/)).toBeOnTheScreen();
  });

  it("Réessayer rend la main à l'appelant", async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    render(<OfflineScreen onRetry={onRetry} />);

    await user.press(screen.getByTestId("offline-retry"));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
