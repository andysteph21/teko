// C-31 : statuts (Accepté / En validation / Refusé), compteur d'impact
// (validated + merged), état vide, CTA vers C-26.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";

const mockListProposals = jest.fn();
jest.mock("@teko/api-client", () => ({
  listMyLandmarkProposals: (...args: unknown[]) => mockListProposals(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import MyLandmarks from "../../../app/(main)/my-landmarks";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

const PROPOSALS = [
  {
    id: "p1",
    name: "Boulangerie d'Akébé",
    category: "market",
    status: "merged",
    created_at: "2026-08-15T10:00:00Z",
  },
  {
    id: "p2",
    name: "Kiosque PMU d'Akébé-Plaine",
    category: "market",
    status: "proposed",
    created_at: "2026-08-24T10:00:00Z",
  },
  {
    id: "p3",
    name: "Stand de brochettes du carrefour",
    category: "other",
    status: "rejected",
    created_at: "2026-08-02T10:00:00Z",
  },
];

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MyLandmarks />
    </QueryClientProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("C-31 Mes repères proposés", () => {
  it("affiche les statuts et le compteur d'impact (1 accepté)", async () => {
    mockListProposals.mockResolvedValue(PROPOSALS);
    renderScreen();

    expect(await screen.findByText("Boulangerie d'Akébé")).toBeTruthy();
    expect(screen.getByText("Accepté")).toBeTruthy();
    expect(screen.getByText("En validation")).toBeTruthy();
    expect(screen.getByText("Refusé")).toBeTruthy();
    expect(screen.getByTestId("my-landmarks-impact")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("état vide + CTA vers C-26", async () => {
    mockListProposals.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByTestId("my-landmarks-empty")).toBeTruthy();
    expect(screen.queryByTestId("my-landmarks-impact")).toBeNull();

    fireEvent.press(screen.getByTestId("my-landmarks-propose"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/propose-landmark");
  });
});
