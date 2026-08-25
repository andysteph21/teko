import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../shell/use-session", () => ({
  useSession: () => ({ session: { user: { id: "admin-1" } }, loading: false }),
}));
vi.mock("../shell/use-admin-profile", () => ({
  useAdminProfile: () => ({ profile: null, isAdmin: true, adminRole: "ops", loading: false }),
}));
vi.mock("@teko/api-client", () => ({
  getMyDriver: vi.fn(),
  getProfile: vi.fn(),
  listDriverDocuments: vi.fn(),
  getKycFileUrl: vi.fn().mockResolvedValue("https://signed.example/piece.jpg"),
  reviewDocument: vi.fn().mockResolvedValue(undefined),
  validateKyc: vi.fn().mockResolvedValue(undefined),
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import {
  getMyDriver,
  getProfile,
  listDriverDocuments,
  reviewDocument,
  validateKyc,
} from "@teko/api-client";
import { KycFile } from "./kyc-file";

const HOUR = 3_600_000;
const DRIVER = {
  id: "d1",
  kyc_status: "pending",
  categories: ["moto"],
  payout_msisdn: "+24106447812",
  created_at: new Date(Date.now() - 4 * HOUR).toISOString(),
  is_active: false,
  deactivated_reason: null,
};
const PROFILE = { id: "d1", full_name: "Steeve Obame", phone: "+24106447812" };

function doc(id: string, type: string, status: string) {
  return {
    id,
    driver_id: "d1",
    type,
    status,
    note: null,
    storage_path: `d1/${type}.jpg`,
    created_at: "2026-08-25T08:00:00Z",
    reviewed_at: null,
    reviewed_by: null,
  };
}

/** 6 pièces requises, l'identité restant à examiner par défaut. */
function docs(idCardStatus = "pending") {
  return [
    doc("doc-1", "id_card", idCardStatus),
    doc("doc-2", "license", "validated"),
    doc("doc-3", "registration", "validated"),
    doc("doc-4", "insurance", "validated"),
    doc("doc-5", "vehicle_photo", "validated"),
    doc("doc-6", "criminal_record", "validated"),
  ];
}

function renderFile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <KycFile driverId="d1" />
    </QueryClientProvider>,
  );
}

function mockFile(idCardStatus = "pending") {
  vi.mocked(getMyDriver).mockResolvedValue(DRIVER as never);
  vi.mocked(getProfile).mockResolvedValue(PROFILE as never);
  vi.mocked(listDriverDocuments).mockResolvedValue(docs(idCardStatus) as never);
}

describe("A-03 / AM-03 dossier KYC", () => {
  it("affiche identité et pièces ; « Tout valider » inerte tant qu'une pièce reste à examiner", async () => {
    mockFile();
    renderFile();
    expect(await screen.findByText("Steeve Obame")).toBeDefined();
    expect(screen.getByText("Pièce d'identité")).toBeDefined();
    const approve = screen.getByTestId("kyc-approve") as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(screen.getByTestId("kyc-approve-blocked").textContent).toContain("Pièce d'identité");
  });

  it("refus d'une pièce : motif obligatoire puis reviewDocument(rejected, motif)", async () => {
    mockFile();
    renderFile();
    await screen.findByText("Steeve Obame");
    fireEvent.click(screen.getByTestId("doc-reject"));
    const confirm = screen.getByTestId("doc-reject-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("doc-reject-note"), {
      target: { value: "Photo floue, date illisible" },
    });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(reviewDocument).toHaveBeenCalledWith(
        expect.anything(),
        "doc-1",
        "rejected",
        "Photo floue, date illisible",
      ),
    );
  });

  it("6 pièces conformes : « Tout valider » actif → validateKyc(accept) puis retour à la file", async () => {
    mockFile("validated");
    renderFile();
    await screen.findByText("Steeve Obame");
    const approve = screen.getByTestId("kyc-approve") as HTMLButtonElement;
    expect(approve.disabled).toBe(false);
    fireEvent.click(approve);
    await waitFor(() =>
      expect(validateKyc).toHaveBeenCalledWith(expect.anything(), "d1", true, undefined),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/kyc"));
  });

  it("refus global : inerte sans motif, puis validateKyc(reject, motif verbatim)", async () => {
    mockFile();
    renderFile();
    await screen.findByText("Steeve Obame");
    const reject = screen.getByTestId("kyc-reject") as HTMLButtonElement;
    expect(reject.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("kyc-note"), {
      target: { value: "Casier judiciaire absent du dossier" },
    });
    fireEvent.click(reject);
    await waitFor(() =>
      expect(validateKyc).toHaveBeenCalledWith(
        expect.anything(),
        "d1",
        false,
        "Casier judiciaire absent du dossier",
      ),
    );
  });
});
