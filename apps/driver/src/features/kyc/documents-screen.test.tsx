// D-05 documents 2/4 : les 6 pièces listées, ajout par pièce via la galerie
// → téléversement ; Continuer plein seulement quand tout est ajouté.

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Providers } from "./test-wrapper";

const mockList = jest.fn();
const mockUpload = jest.fn();
jest.mock("@teko/api-client", () => ({
  listMyDocuments: (...args: unknown[]) => mockList(...args),
  uploadKycDocument: (...args: unknown[]) => mockUpload(...args),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../auth/use-session", () => ({
  useSession: () => ({ session: { user: { id: "u1" } }, loading: false }),
}));

const mockPick = jest.fn();
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockPick(...args),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import Documents from "../../../app/(auth)/documents";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }) as never;
});

const SIX_TYPES = [
  "license",
  "id_card",
  "registration",
  "insurance",
  "vehicle_photo",
  "criminal_record",
];

describe("D-05 Documents", () => {
  it("liste les 6 pièces, CTA désactivé tant qu'il en manque", async () => {
    mockList.mockResolvedValueOnce([]);
    render(<Documents />, { wrapper: Providers });

    for (const type of SIX_TYPES) {
      expect(await screen.findByTestId(`doc-${type}`)).toBeOnTheScreen();
    }
    expect(screen.getByTestId("documents-continue")).toBeDisabled();
    expect(screen.getByText("Continuer · 6 documents restants")).toBeOnTheScreen();
    expect(screen.getByTestId("documents-continue-anyway")).toBeOnTheScreen();
  });

  it("ajout d'une pièce : galerie → téléversement du bon type", async () => {
    mockList.mockResolvedValue([]);
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///permis.jpg", mimeType: "image/jpeg" }],
    });
    mockUpload.mockResolvedValueOnce({ id: "d1" });
    const user = userEvent.setup();
    render(<Documents />, { wrapper: Providers });

    await user.press(await screen.findByTestId("doc-license"));

    await waitFor(() =>
      expect(mockUpload).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ userId: "u1", type: "license", contentType: "image/jpeg" }),
      ),
    );
  });

  it("pièce refusée : motif admin affiché sur la ligne", async () => {
    mockList.mockResolvedValueOnce([
      {
        id: "d1",
        type: "registration",
        status: "rejected",
        note: "Photo illisible, reflet du flash.",
        storage_path: "u1/registration.jpg",
        created_at: "2026-08-25",
      },
    ]);
    render(<Documents />, { wrapper: Providers });

    expect(await screen.findByTestId("doc-registration-motif")).toHaveTextContent(
      "Refusée · Photo illisible, reflet du flash.",
    );
  });
});
