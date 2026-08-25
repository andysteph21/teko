import { describe, expect, it, vi } from "vitest";
import {
  dashboardCounts,
  getCommission,
  getKycFileUrl,
  inviteAdmin,
  listAdminInvites,
  listAppConfig,
  listAuditLog,
  listDriverDocuments,
  listIncidents,
  listKycQueue,
  listLandmarkProposals,
  listPayments,
  listProfiles,
  listRecentRides,
  listRoadProposals,
  listStatements,
  reviewDocument,
  runDailyClose,
  setCommission,
  setDriverActive,
  updateAppConfig,
  updateIncident,
  validateKyc,
  validateLandmarkProposal,
  validateRoadProposal,
} from "./admin";
import type { TekoClient } from "./client";

const CHAIN = [
  "from",
  "select",
  "insert",
  "update",
  "eq",
  "in",
  "ilike",
  "order",
  "limit",
] as const;
type Mock = TekoClient & Record<(typeof CHAIN)[number] | "rpc", ReturnType<typeof vi.fn>>;

function tableClient(data: unknown): Mock {
  const chain: Record<string, unknown> = {};
  for (const m of CHAIN) chain[m] = vi.fn(() => chain);
  chain.rpc = vi.fn().mockResolvedValue({ data, error: null });
  // biome-ignore lint/suspicious/noThenProperty: chaîne PostgREST simulée, résolue par await
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data, error: null });
  return chain as unknown as Mock;
}

describe("file KYC (A-03)", () => {
  it("listKycQueue filtre par statut et joint le profil", async () => {
    const client = tableClient([{ id: "d1", profiles: { full_name: "Jean" } }]);
    const rows = await listKycQueue(client);
    expect(client.eq).toHaveBeenCalledWith("kyc_status", "pending");
    expect(rows[0]?.profiles?.full_name).toBe("Jean");
  });

  it("validateKyc passe le motif seulement s'il existe", async () => {
    const client = tableClient(null);
    await validateKyc(client, "d1", true);
    expect(client.rpc).toHaveBeenCalledWith("validate_kyc", { p_driver: "d1", p_accept: true });
    await validateKyc(client, "d1", false, "photo floue");
    expect(client.rpc).toHaveBeenLastCalledWith("validate_kyc", {
      p_driver: "d1",
      p_accept: false,
      p_note: "photo floue",
    });
  });

  it("reviewDocument et listDriverDocuments ciblent la pièce", async () => {
    const client = tableClient([]);
    await reviewDocument(client, "doc1", "rejected", "illisible");
    expect(client.update).toHaveBeenCalledWith({ status: "rejected", note: "illisible" });
    await listDriverDocuments(client, "d1");
    expect(client.eq).toHaveBeenCalledWith("driver_id", "d1");
  });

  it("getKycFileUrl signe une URL courte du bucket kyc", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://x/signed" },
      error: null,
    });
    const client = {
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as unknown as TekoClient;
    expect(await getKycFileUrl(client, "d1/license.jpg")).toBe("https://x/signed");
    expect(createSignedUrl).toHaveBeenCalledWith("d1/license.jpg", 300);
  });
});

describe("cartographie (A-04)", () => {
  it("propositions listées par statut, validation par RPC", async () => {
    const client = tableClient([]);
    await listLandmarkProposals(client);
    expect(client.eq).toHaveBeenCalledWith("status", "proposed");
    await validateLandmarkProposal(client, "p1", true);
    expect(client.rpc).toHaveBeenCalledWith("validate_landmark_proposal", {
      p_proposal: "p1",
      p_accept: true,
    });
    await listRoadProposals(client, "validated");
    expect(client.eq).toHaveBeenLastCalledWith("status", "validated");
    await validateRoadProposal(client, "r1", false);
    expect(client.rpc).toHaveBeenLastCalledWith("validate_road_proposal", {
      p_proposal: "r1",
      p_accept: false,
    });
  });
});

describe("finance (A-05)", () => {
  it("commission lue/écrite via RPC gardée", async () => {
    const client = tableClient({ type: "percent", value: "15" });
    expect(await getCommission(client)).toEqual({ type: "percent", value: 15 });
    await setCommission(client, "percent", 12);
    expect(client.rpc).toHaveBeenLastCalledWith("set_commission", {
      p_type: "percent",
      p_value: 12,
    });
  });

  it("relevés et paiements filtrables, clôture manuelle", async () => {
    const client = tableClient([]);
    await listStatements(client, "2026-08-25");
    expect(client.eq).toHaveBeenCalledWith("business_day", "2026-08-25");
    await listPayments(client, "pending");
    expect(client.eq).toHaveBeenLastCalledWith("status", "pending");
    const closer = tableClient(3);
    expect(await runDailyClose(closer)).toBe(3);
  });
});

describe("utilisateurs & équipe (A-06/A-08)", () => {
  it("listProfiles compose rôle + recherche", async () => {
    const client = tableClient([]);
    await listProfiles(client, { role: "driver", search: "nad" });
    expect(client.eq).toHaveBeenCalledWith("role", "driver");
    expect(client.ilike).toHaveBeenCalledWith("full_name", "%nad%");
  });

  it("setDriverActive efface le motif à la réactivation", async () => {
    const client = tableClient(null);
    await setDriverActive(client, "d1", false, "solde impayé");
    expect(client.update).toHaveBeenCalledWith({
      is_active: false,
      deactivated_reason: "solde impayé",
    });
    await setDriverActive(client, "d1", true);
    expect(client.update).toHaveBeenLastCalledWith({ is_active: true, deactivated_reason: null });
  });

  it("invitations : création RPC + liste", async () => {
    const client = tableClient({ id: "i1", admin_role: "ops" });
    const invite = await inviteAdmin(client, "+24107000009", "ops");
    expect(invite.id).toBe("i1");
    await listAdminInvites(tableClient([]));
  });
});

describe("incidents, journal, config", () => {
  it("incidents filtrés et mis à jour", async () => {
    const client = tableClient([]);
    await listIncidents(client, "open");
    expect(client.eq).toHaveBeenCalledWith("status", "open");
    await updateIncident(client, "i1", "resolved");
    expect(client.update).toHaveBeenCalledWith({ status: "resolved" });
  });

  it("journal d'audit trié par date, filtrable par action", async () => {
    const client = tableClient([]);
    await listAuditLog(client, { action: "kyc" });
    expect(client.order).toHaveBeenCalledWith("at", { ascending: false });
    expect(client.ilike).toHaveBeenCalledWith("action", "%kyc%");
  });

  it("app_config lue et mise à jour par clé", async () => {
    const client = tableClient([]);
    await listAppConfig(client);
    await updateAppConfig(client, "commission", { type: "percent", value: 15 });
    expect(client.eq).toHaveBeenLastCalledWith("key", "commission");
  });
});

describe("tableau de bord (A-02)", () => {
  it("dashboardCounts agrège 4 compteurs head-only", async () => {
    const counts = [4, 12, 3, 1];
    let call = 0;
    const chain: Record<string, unknown> = {};
    for (const m of CHAIN) chain[m] = vi.fn(() => chain);
    // biome-ignore lint/suspicious/noThenProperty: chaîne PostgREST simulée, résolue par await
    chain.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: null, error: null, count: counts[call++] });
    const result = await dashboardCounts(chain as unknown as TekoClient);
    expect(result).toEqual({ activeRides: 4, onlineDrivers: 12, pendingKyc: 3, openIncidents: 1 });
  });

  it("listRecentRides limite la liste", async () => {
    const client = tableClient([{ id: "r1" }]);
    const rides = await listRecentRides(client, 5);
    expect(client.limit).toHaveBeenCalledWith(5);
    expect(rides).toHaveLength(1);
  });
});
