import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("@teko/api-client", () => ({
  listAuditLog: vi.fn(),
}));

import { listAuditLog } from "@teko/api-client";
import { auditToCsv } from "./audit-csv";
import { JournalTab } from "./journal-tab";

const entries = [
  {
    id: 1,
    at: "2026-08-12T10:20:05Z",
    actor: "6f9619ff-8b86-d011-b42d-00c04fc964ff",
    action: "set_commission",
    entity: "app_config",
    entity_id: null,
    before: { value: 12 },
    after: { value: 15 },
  },
  {
    id: 2,
    at: "2026-08-09T04:00:03Z",
    actor: null,
    action: "daily_close",
    entity: "daily_statements",
    entity_id: null,
    before: null,
    after: null,
  },
] as any;

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <JournalTab />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listAuditLog).mockResolvedValue(entries);
});

describe("A-10 journal d'audit", () => {
  it("liste les entrées : acteur court, Système pour les entrées auto", async () => {
    renderTab();
    expect(await screen.findByText("set_commission")).toBeDefined();
    expect(screen.getByText("6f9619ff")).toBeDefined();
    expect(screen.getByText("Système")).toBeDefined();
  });

  it("déplie le détail avant/après d'une entrée", async () => {
    renderTab();
    fireEvent.click(await screen.findByTestId("journal-detail-1"));
    expect(screen.getByText('avant · {"value":12}')).toBeDefined();
    expect(screen.getByText('après · {"value":15}')).toBeDefined();
  });

  it("filtre texte → listAuditLog({ action })", async () => {
    renderTab();
    await screen.findByText("set_commission");
    fireEvent.change(screen.getByTestId("journal-filter"), { target: { value: "kyc" } });
    await waitFor(() =>
      expect(listAuditLog).toHaveBeenCalledWith(expect.anything(), { limit: 200, action: "kyc" }),
    );
  });
});

describe("export CSV", () => {
  it("échappe les guillemets et sérialise avant/après", () => {
    const csv = auditToCsv([
      {
        id: 3,
        at: "2026-08-01T00:00:00Z",
        actor: null,
        action: 'action "citée"',
        entity: "rides",
        entity_id: "abc",
        before: null,
        after: { note: "ok" },
      } as any,
    ]);
    const [header, line] = csv.split("\n");
    expect(header).toBe("horodatage,acteur,action,entite,entite_id,avant,apres");
    expect(line).toContain('"action ""citée"""');
    expect(line).toContain('"{""note"":""ok""}"');
    expect(line).toContain('"système"');
  });
});
