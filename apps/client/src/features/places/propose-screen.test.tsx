// C-26 : nom pré-rempli depuis la recherche, catégorie requise, envoi via
// propose_landmark (position par défaut), état « En validation », erreur.

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

jest.mock("@maplibre/maplibre-react-native", () => ({
  Map: ({ children }: { children?: ReactNode }) => children ?? null,
  Camera: () => null,
  GeoJSONSource: ({ children }: { children?: ReactNode }) => children ?? null,
  Layer: () => null,
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children?: ReactNode }) => children ?? null,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPropose = jest.fn();
jest.mock("@teko/maps", () => {
  const actual = jest.requireActual("@teko/maps");
  return {
    ...actual,
    TekoMapData: jest.fn().mockImplementation(() => ({ proposeLandmark: mockPropose })),
  };
});

jest.mock("@teko/api-client", () => ({
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
  mapApiError: (raw: unknown) => {
    const err = new Error(String(raw)) as Error & { code: string };
    err.code = "unknown";
    return err;
  },
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ name: "Boulangerie d'Akébé" }),
}));

import ProposeLandmark from "../../../app/(main)/propose-landmark";
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

describe("C-26 Proposer un repère", () => {
  it("nom pré-rempli, catégorie choisie, envoi → état « En validation »", async () => {
    mockPropose.mockResolvedValueOnce({ id: "prop-1", status: "proposed" });
    render(<ProposeLandmark />);

    expect(screen.getByTestId("propose-name").props.value).toBe("Boulangerie d'Akébé");

    fireEvent.press(screen.getByTestId("propose-cat-market"));
    fireEvent.press(screen.getByTestId("propose-submit"));

    expect(mockPropose).toHaveBeenCalledWith({
      name: "Boulangerie d'Akébé",
      category: "market",
      position: { lon: 9.4536, lat: 0.4032 },
    });
    expect(await screen.findByTestId("propose-success")).toBeTruthy();
    expect(screen.getByText("En validation")).toBeTruthy();

    fireEvent.press(screen.getByTestId("propose-close"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("échec de l'envoi : message d'erreur générique, formulaire conservé", async () => {
    mockPropose.mockRejectedValueOnce(new Error("propose_landmark: boom"));
    render(<ProposeLandmark />);

    fireEvent.press(screen.getByTestId("propose-cat-other"));
    fireEvent.press(screen.getByTestId("propose-submit"));

    expect(await screen.findByText("Une erreur est survenue. Réessayez.")).toBeTruthy();
    expect(screen.queryByTestId("propose-success")).toBeNull();
  });
});
