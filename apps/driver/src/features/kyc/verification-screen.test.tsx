// D-08/D-08b : statut par pièce ; pièce refusée → motif admin VERBATIM et
// remplacement ciblé ; dossier validé → « Passer en ligne ».

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Providers } from "./test-wrapper";

const mockGetMyDriver = jest.fn();
const mockList = jest.fn();
const mockUpload = jest.fn();
jest.mock("@teko/api-client", () => ({
  getMyDriver: (...args: unknown[]) => mockGetMyDriver(...args),
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

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

import Verification from "../../../app/(auth)/verification";

const MOTIF = "Photo illisible, reflet du flash sur la partie droite.";

function doc(type: string, status: string, note: string | null = null) {
  return { id: `d-${type}`, type, status, note, storage_path: `u1/${type}.jpg`, created_at: "" };
}

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

describe("D-08b Pièce refusée", () => {
  it("affiche le motif admin verbatim et relance le picker pour CE type", async () => {
    mockGetMyDriver.mockResolvedValue({
      id: "u1",
      kyc_status: "pending",
      payout_msisdn: "+241070",
    });
    mockList.mockResolvedValue([
      doc("license", "validated"),
      doc("registration", "rejected", MOTIF),
    ]);
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///new.jpg", mimeType: "image/jpeg" }],
    });
    mockUpload.mockResolvedValueOnce({ id: "d2" });
    const user = userEvent.setup();
    render(<Verification />, { wrapper: Providers });

    expect(await screen.findByText("Une pièce à reprendre")).toBeOnTheScreen();
    expect(screen.getByTestId("rejected-registration-motif")).toHaveTextContent(
      `Motif de l'équipe Teko : « ${MOTIF} »`,
    );
    expect(screen.getByTestId("status-registration")).toHaveTextContent("À remplacer");
    expect(screen.getByTestId("status-license")).toHaveTextContent("Validé");

    await user.press(screen.getByTestId("replace-registration"));
    await waitFor(() =>
      expect(mockUpload).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ type: "registration", userId: "u1" }),
      ),
    );
  });
});

describe("D-08 Vérification", () => {
  it("dossier validé → « Passer en ligne » mène à l'accueil", async () => {
    mockGetMyDriver.mockResolvedValue({
      id: "u1",
      kyc_status: "validated",
      payout_msisdn: "+24107000002",
    });
    mockList.mockResolvedValue([doc("license", "validated")]);
    const user = userEvent.setup();
    render(<Verification />, { wrapper: Providers });

    await user.press(await screen.findByTestId("go-online"));

    expect(mockReplace).toHaveBeenCalledWith("/(main)/home");
  });
});
