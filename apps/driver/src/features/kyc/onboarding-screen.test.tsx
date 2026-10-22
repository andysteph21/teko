// D-02 : trois diapositives (gains, repères, horaires), « Passer » et la
// fin mènent au numéro (D-03).

import { render, screen, userEvent } from "@testing-library/react-native";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

import Onboarding from "../../../app/(auth)/onboarding";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("D-02 Onboarding chauffeur", () => {
  it("déroule les 3 diapos puis mène au numéro", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    expect(screen.getByText("Vos courses, votre solde suivi")).toBeOnTheScreen();
    await user.press(screen.getByTestId("onboarding-next"));
    expect(screen.getByText("Guidé par les repères")).toBeOnTheScreen();
    await user.press(screen.getByTestId("onboarding-next"));
    expect(screen.getByText("Maître de vos horaires")).toBeOnTheScreen();
    await user.press(screen.getByTestId("onboarding-next"));

    expect(mockReplace).toHaveBeenCalledWith("/(auth)/phone");
  });

  it("« Passer » saute directement au numéro", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    await user.press(screen.getByTestId("onboarding-skip"));

    expect(mockReplace).toHaveBeenCalledWith("/(auth)/phone");
  });
});
