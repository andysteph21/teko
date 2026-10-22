import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  statements: [
    {
      id: "st-1",
      business_day: "2026-08-25",
      driver_id: "aaaabbbb-1111-2222-3333-444455556666",
      opening: "0",
      total_commission: "1500",
      total_mobile_credit: "500",
      closing: "-1000",
      status: "open",
      payout_amount: null,
      settled_amount: null,
      created_at: "2026-08-25T03:00:00Z",
      updated_at: "2026-08-25T03:00:00Z",
    },
    {
      id: "st-2",
      business_day: "2026-08-25",
      driver_id: "ccccdddd-1111-2222-3333-444455556666",
      opening: "-2000",
      total_commission: "3000",
      total_mobile_credit: "0",
      closing: "-5000",
      status: "overdue",
      payout_amount: null,
      settled_amount: null,
      created_at: "2026-08-25T03:00:00Z",
      updated_at: "2026-08-25T03:00:00Z",
    },
  ],
  payments: [
    {
      id: "pay-1",
      amount: "1500",
      currency: "XAF",
      direction: "in",
      kind: "ride_collection",
      status: "success",
      created_at: "2026-08-25T10:00:00Z",
      driver_id: "d1",
      ride_id: "r1",
      partner_txn_id: "MP-1",
      provider: "airtel",
      provider_txn_id: null,
      raw: {},
      updated_at: "2026-08-25T10:00:00Z",
    },
    {
      id: "pay-2",
      amount: "12750",
      currency: "XAF",
      direction: "out",
      kind: "payout",
      status: "failed",
      created_at: "2026-08-25T04:02:00Z",
      driver_id: "d2",
      ride_id: null,
      partner_txn_id: "DP-2",
      provider: "airtel",
      provider_txn_id: null,
      raw: { error_code: "TA-408" },
      updated_at: "2026-08-25T04:05:00Z",
    },
  ],
}));

vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("../shell/use-session", () => ({
  useSession: () => ({ session: { user: { id: "admin-1" } }, loading: false }),
}));
vi.mock("../shell/use-admin-profile", () => ({
  useAdminProfile: () => ({ profile: null, isAdmin: true, adminRole: "finance", loading: false }),
}));
vi.mock("@teko/api-client", () => ({
  TekoApiError: class extends Error {
    code = "unknown";
  },
  getCommission: vi.fn().mockResolvedValue({ type: "percent", value: 15 }),
  setCommission: vi.fn().mockResolvedValue(undefined),
  listStatements: vi.fn().mockResolvedValue(fixtures.statements),
  listPayments: vi.fn().mockResolvedValue(fixtures.payments),
  runDailyClose: vi.fn().mockResolvedValue(3),
  listManualReceipts: vi.fn().mockResolvedValue([]),
  listCancellationClaims: vi.fn().mockResolvedValue([]),
  listPayoutRequests: vi.fn().mockResolvedValue([]),
  listProfiles: vi.fn().mockResolvedValue([]),
}));

import { listPayments, listStatements } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { FinancePage } from "./finance-page";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FinancePage />
    </QueryClientProvider>,
  );
}

describe("A-05 finance", () => {
  it("affiche la commission, les relevés du jour et les totaux de colonnes", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("commission-value").textContent).toContain("15 % par course"),
    );
    expect(await screen.findAllByTestId("statement-row")).toHaveLength(2);
    expect(screen.getByText("En cours")).toBeDefined();
    expect(screen.getByText("En retard")).toBeDefined();
    expect(screen.getByTestId("statements-total-commission").textContent).toBe(formatXaf(4500));
    expect(screen.getByTestId("statements-total-closing").textContent).toBe(formatXaf(-6000));
  });

  it("filtre les paiements par statut et montre l'échec avec son code", async () => {
    renderPage();
    const rows = await screen.findAllByTestId("payment-row");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("Course Airtel")).toBeDefined();
    expect(screen.getByText("Versement")).toBeDefined();
    // textContent brut : formatXaf émet espaces insécables + signe moins U+2212.
    expect(rows.some((row) => row.textContent?.includes(formatXaf(-12750)))).toBe(true);
    expect(screen.getByText("TA-408")).toBeDefined();

    fireEvent.click(screen.getByTestId("payments-filter-failed"));
    await waitFor(() => expect(listPayments).toHaveBeenCalledWith(expect.anything(), "failed"));
  });

  it("recharge les relevés quand on change de jour métier", async () => {
    renderPage();
    await screen.findAllByTestId("statement-row");
    fireEvent.change(screen.getByTestId("statements-day"), { target: { value: "2026-08-20" } });
    await waitFor(() =>
      expect(listStatements).toHaveBeenCalledWith(expect.anything(), "2026-08-20"),
    );
  });

  it("rôle finance : modification de commission et clôture désactivées", async () => {
    renderPage();
    await screen.findAllByTestId("statement-row");
    expect((screen.getByTestId("commission-edit") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Réservé au superadmin")).toBeDefined();
    expect((screen.getByTestId("close-run") as HTMLButtonElement).disabled).toBe(true);
  });
});
