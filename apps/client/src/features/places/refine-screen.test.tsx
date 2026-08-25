// C-09 : puce-préfixe sur l'indication, Continuer → setDestinationHint +
// navigation C-10 ; sans destination → retour à la recherche.

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

jest.mock("@maplibre/maplibre-react-native", () => ({
  Map: ({ children }: { children?: ReactNode }) => children ?? null,
  Camera: () => null,
  GeoJSONSource: ({ children }: { children?: ReactNode }) => children ?? null,
  Layer: () => null,
}));
jest.mock("../data/data-state", () => ({
  useResolvedMapMode: () => ({ mode: "full" }),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children?: ReactNode }) => children ?? null,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

import Refine from "../../../app/(main)/refine";
import { useBookingStore } from "../booking/store";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  useBookingStore.getState().reset();
});

describe("C-09 Affinage", () => {
  it("puce préfixe + Continuer → indication enregistrée et navigation C-10", () => {
    useBookingStore.getState().setDestination({
      position: { lon: 9.4536, lat: 0.4032 },
      label: "Pharmacie du Gros-Bouquet",
      landmarkId: "lm1",
    });
    render(<Refine />);

    expect(screen.getByText("Pharmacie du Gros-Bouquet")).toBeTruthy();

    fireEvent.press(screen.getByTestId("refine-chip-Derrière"));
    expect(screen.getByTestId("refine-hint").props.value).toBe("Derrière ");

    fireEvent.changeText(screen.getByTestId("refine-hint"), "Derrière le portail bleu");
    fireEvent.press(screen.getByTestId("refine-continue"));

    expect(useBookingStore.getState().destination?.hint).toBe("Derrière le portail bleu");
    expect(mockPush).toHaveBeenCalledWith("/(main)/category");
  });

  it("sans destination : renvoi vers la recherche", () => {
    render(<Refine />);
    expect(mockReplace).toHaveBeenCalledWith("/(main)/search");
  });
});
