import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@teko/api-client", () => ({
  listKycQueue: vi.fn(),
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import { listKycQueue } from "@teko/api-client";
import { KycQueue } from "./kyc-queue";

const HOUR = 3_600_000;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "d1",
    kyc_status: "pending",
    categories: ["moto"],
    created_at: new Date(Date.now() - 4 * HOUR).toISOString(),
    profiles: { full_name: "Steeve Obame", phone: "+24106447812", created_at: "" },
    ...overrides,
  };
}

function renderQueue() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <KycQueue />
    </QueryClientProvider>,
  );
}

describe("A-03 / AM-02 file KYC", () => {
  it("liste nom, catégories, téléphone, ancienneté et lien vers le dossier", async () => {
    vi.mocked(listKycQueue).mockResolvedValue([row()] as never);
    renderQueue();
    expect(await screen.findByText("Steeve Obame")).toBeDefined();
    expect(screen.getByText("Moto-taxi · +24106447812")).toBeDefined();
    expect(screen.getByText("il y a 4 h")).toBeDefined();
    expect(screen.getByTestId("kyc-row").getAttribute("href")).toBe("/kyc/d1");
    expect(listKycQueue).toHaveBeenCalledWith(expect.anything(), "pending");
  });

  it("l'onglet Validés recharge la file avec le statut validated", async () => {
    vi.mocked(listKycQueue).mockResolvedValue([] as never);
    renderQueue();
    fireEvent.click(screen.getByTestId("kyc-tab-validated"));
    await waitFor(() => expect(listKycQueue).toHaveBeenCalledWith(expect.anything(), "validated"));
  });

  it("état vide propre : « Aucun dossier en attente »", async () => {
    vi.mocked(listKycQueue).mockResolvedValue([] as never);
    renderQueue();
    expect(await screen.findByText("Aucun dossier en attente")).toBeDefined();
  });

  it("bandeau SLA quand un dossier approche les 48 h", async () => {
    vi.mocked(listKycQueue).mockResolvedValue([
      row({ id: "d2", created_at: new Date(Date.now() - 44 * HOUR).toISOString() }),
    ] as never);
    renderQueue();
    expect(await screen.findByText("1 dossier approche les 48 h")).toBeDefined();
  });
});
