// C-08 : recherche en direct (anti-rebond), sélection d'un résultat →
// destination du brouillon + navigation C-09, ligne « Proposer » → C-26.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

const mockSearchLandmarks = jest.fn();
const mockListSavedPlaces = jest.fn();
const mockListMyRides = jest.fn();
jest.mock("@teko/api-client", () => ({
  searchLandmarksByName: (...args: unknown[]) => mockSearchLandmarks(...args),
  listSavedPlaces: (...args: unknown[]) => mockListSavedPlaces(...args),
  listMyRides: (...args: unknown[]) => mockListMyRides(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import Search from "../../../app/(main)/search";
import { useBookingStore } from "../booking/store";
import { SEARCH_DEBOUNCE_MS } from "./use-landmark-search";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const LANDMARK = {
  id: "lm1",
  name: "Pharmacie du Gros-Bouquet",
  geom: { type: "Point", coordinates: [9.4536, 0.4032] },
};

function renderSearch() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <Search />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useBookingStore.getState().reset();
  useBookingStore
    .getState()
    .setOrigin({ position: { lon: 9.45, lat: 0.41 }, label: "Ma position" });
  mockListSavedPlaces.mockResolvedValue([]);
  mockListMyRides.mockResolvedValue([]);
  mockSearchLandmarks.mockResolvedValue([]);
});

afterEach(() => jest.useRealTimers());

async function searchFor(query: string) {
  fireEvent.changeText(screen.getByTestId("search-input"), query);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  });
}

describe("C-08 Recherche", () => {
  it("sans GPS, choisit d'abord le départ sans naviguer ni inventer une position", async () => {
    useBookingStore.getState().setOrigin(null);
    mockSearchLandmarks.mockResolvedValue([LANDMARK]);
    renderSearch();
    expect(screen.getByText("Choisir le départ")).toBeOnTheScreen();
    await searchFor("phar");
    fireEvent.press(await screen.findByTestId("search-result-lm1"));
    expect(useBookingStore.getState().origin).toEqual({
      position: { lon: 9.4536, lat: 0.4032 },
      label: LANDMARK.name,
      landmarkId: "lm1",
    });
    expect(useBookingStore.getState().destination).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    await searchFor("phar");
    fireEvent.press(await screen.findByTestId("search-result-lm1"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/refine");
  });

  it("permet de remplacer le départ GPS par un repère sans changer la destination", async () => {
    mockSearchLandmarks.mockResolvedValue([LANDMARK]);
    renderSearch();
    fireEvent.press(screen.getByTestId("search-origin"));
    await searchFor("phar");
    fireEvent.press(await screen.findByTestId("search-result-lm1"));
    expect(useBookingStore.getState().origin?.landmarkId).toBe("lm1");
    expect(useBookingStore.getState().destination).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
  it("recherche en direct : sélection → destination + navigation C-09", async () => {
    useBookingStore
      .getState()
      .setOrigin({ position: { lon: 9.45, lat: 0.41 }, label: "Ma position" });
    mockSearchLandmarks.mockResolvedValue([LANDMARK]);
    renderSearch();

    await searchFor("phar");
    const row = await screen.findByTestId("search-result-lm1");
    fireEvent.press(row);

    expect(useBookingStore.getState().destination).toEqual({
      position: { lon: 9.4536, lat: 0.4032 },
      label: "Pharmacie du Gros-Bouquet",
      landmarkId: "lm1",
    });
    expect(mockPush).toHaveBeenCalledWith("/(main)/refine");
  });

  it("aucun résultat : la ligne « Proposer » emmène vers C-26 avec le nom saisi", async () => {
    renderSearch();

    await searchFor("kiosque pmu");
    const propose = await screen.findByTestId("search-propose-query");
    fireEvent.press(propose);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/propose-landmark",
      params: { name: "kiosque pmu" },
    });
  });

  it("au repos : lieux enregistrés (Domicile) et ligne « Proposer un nouveau repère »", async () => {
    mockListSavedPlaces.mockResolvedValue([
      {
        id: "sp1",
        kind: "home",
        label: "Maison Akébé",
        geom: { type: "Point", coordinates: [9.46, 0.4] },
        landmark_id: null,
        hint: null,
      },
    ]);
    renderSearch();

    const saved = await screen.findByTestId("search-saved-sp1");
    expect(screen.getByText("Domicile")).toBeTruthy();
    expect(screen.getByTestId("search-propose")).toBeTruthy();

    fireEvent.press(saved);
    expect(useBookingStore.getState().destination?.label).toBe("Maison Akébé");
    expect(mockPush).toHaveBeenCalledWith("/(main)/refine");
  });
});
