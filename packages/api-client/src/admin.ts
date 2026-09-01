// Console d'administration (lot 5) — lectures RLS admin + RPC gardées en
// base (validate_kyc, set_commission, invite_admin… : les gardes réelles
// sont côté Postgres, l'UI n'est qu'une couche de confort).

import type { DbEnum, Json, TableRow } from "@teko/types";
import type { TekoClient } from "./client";
import { mapApiError, unwrap } from "./errors";

// --- KYC (A-03) -------------------------------------------------------------

export interface PendingKycRow extends TableRow<"drivers"> {
  profiles: Pick<TableRow<"profiles">, "full_name" | "phone" | "created_at"> | null;
}

export async function listKycQueue(
  client: TekoClient,
  status: DbEnum<"kyc_status"> = "pending",
): Promise<PendingKycRow[]> {
  return unwrap(
    await client
      .from("drivers")
      .select("*, profiles(full_name, phone, created_at)")
      .eq("kyc_status", status)
      .order("created_at", { ascending: true }),
  ) as PendingKycRow[];
}

export async function listDriverDocuments(
  client: TekoClient,
  driverId: string,
): Promise<TableRow<"driver_documents">[]> {
  return unwrap(
    await client
      .from("driver_documents")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false }),
  );
}

/** URL signée courte d'une pièce du bucket privé `kyc`. */
export async function getKycFileUrl(
  client: TekoClient,
  storagePath: string,
  expiresInS = 300,
): Promise<string> {
  const { data, error } = await client.storage.from("kyc").createSignedUrl(storagePath, expiresInS);
  if (error) throw mapApiError(error);
  return data.signedUrl;
}

export async function validateKyc(
  client: TekoClient,
  driverId: string,
  accept: boolean,
  note?: string,
): Promise<void> {
  unwrap(
    await client.rpc("validate_kyc", {
      p_driver: driverId,
      p_accept: accept,
      ...(note ? { p_note: note } : {}),
    }),
  );
}

/** Statut d'une pièce précise (refus ciblé avec motif, D-08b). */
export async function reviewDocument(
  client: TekoClient,
  documentId: string,
  status: Extract<DbEnum<"kyc_status">, "validated" | "rejected">,
  note?: string,
): Promise<void> {
  unwrap(
    await client
      .from("driver_documents")
      .update({ status, note: note ?? null })
      .eq("id", documentId),
  );
}

// --- Cartographie (A-04) ----------------------------------------------------

export async function listLandmarkProposals(
  client: TekoClient,
  status: DbEnum<"geo_status"> = "proposed",
): Promise<TableRow<"landmark_proposals">[]> {
  return unwrap(
    await client
      .from("landmark_proposals")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: true }),
  );
}

export async function validateLandmarkProposal(
  client: TekoClient,
  proposalId: string,
  accept: boolean,
): Promise<void> {
  unwrap(
    await client.rpc("validate_landmark_proposal", { p_proposal: proposalId, p_accept: accept }),
  );
}

export async function listRoadProposals(
  client: TekoClient,
  status: DbEnum<"geo_status"> = "proposed",
): Promise<TableRow<"road_proposals">[]> {
  return unwrap(
    await client
      .from("road_proposals")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: true }),
  );
}

export async function validateRoadProposal(
  client: TekoClient,
  proposalId: string,
  accept: boolean,
): Promise<void> {
  unwrap(await client.rpc("validate_road_proposal", { p_proposal: proposalId, p_accept: accept }));
}

// --- Finance (A-05) ---------------------------------------------------------

export async function getCommission(client: TekoClient): Promise<{ type: string; value: number }> {
  const raw = unwrap(await client.rpc("get_commission")) as { type: string; value: number };
  return { type: raw.type, value: Number(raw.value) };
}

export async function setCommission(
  client: TekoClient,
  type: "percent" | "fixed",
  value: number,
): Promise<void> {
  unwrap(await client.rpc("set_commission", { p_type: type, p_value: value }));
}

export async function listStatements(
  client: TekoClient,
  businessDay?: string,
): Promise<TableRow<"daily_statements">[]> {
  let query = client
    .from("daily_statements")
    .select("*")
    .order("business_day", { ascending: false })
    .limit(200);
  if (businessDay) query = query.eq("business_day", businessDay);
  return unwrap(await query);
}

export async function listPayments(
  client: TekoClient,
  status?: DbEnum<"payment_status">,
): Promise<TableRow<"payments">[]> {
  let query = client
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  return unwrap(await query);
}

/** Clôture manuelle (garde backend : admin/service). */
export async function runDailyClose(client: TekoClient): Promise<number> {
  return Number(unwrap(await client.rpc("daily_close")));
}

// --- Utilisateurs / équipe (A-06, A-08) -------------------------------------

export async function listProfiles(
  client: TekoClient,
  options: { role?: DbEnum<"user_role">; search?: string; limit?: number } = {},
): Promise<TableRow<"profiles">[]> {
  let query = client
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);
  if (options.role) query = query.eq("role", options.role);
  if (options.search) query = query.ilike("full_name", `%${options.search}%`);
  return unwrap(await query);
}

export async function setDriverActive(
  client: TekoClient,
  driverId: string,
  active: boolean,
  reason?: string,
): Promise<void> {
  unwrap(
    await client
      .from("drivers")
      .update({ is_active: active, deactivated_reason: active ? null : (reason ?? null) })
      .eq("id", driverId),
  );
}

export async function inviteAdmin(
  client: TekoClient,
  phone: string,
  role: DbEnum<"admin_role">,
): Promise<TableRow<"admin_invites">> {
  // GoTrue stocke les numéros sans « + » : chiffres seuls, comme la
  // normalisation serveur d'invite_admin (défense en profondeur).
  return unwrap(
    await client.rpc("invite_admin", { p_phone: phone.replace(/\D/g, ""), p_role: role }),
  ) as TableRow<"admin_invites">;
}

export async function listAdminInvites(client: TekoClient): Promise<TableRow<"admin_invites">[]> {
  return unwrap(
    await client.from("admin_invites").select("*").order("created_at", { ascending: false }),
  );
}

// --- Incidents / SOS (A-02, AM-06) ------------------------------------------

export async function listIncidents(
  client: TekoClient,
  status?: DbEnum<"incident_status">,
): Promise<TableRow<"incidents">[]> {
  let query = client
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (status) query = query.eq("status", status);
  return unwrap(await query);
}

export async function updateIncident(
  client: TekoClient,
  incidentId: string,
  status: DbEnum<"incident_status">,
): Promise<void> {
  unwrap(await client.from("incidents").update({ status }).eq("id", incidentId));
}

// --- Journal & config (A-07, A-10) ------------------------------------------

export async function listAuditLog(
  client: TekoClient,
  options: { limit?: number; action?: string } = {},
): Promise<TableRow<"audit_log">[]> {
  let query = client
    .from("audit_log")
    .select("*")
    .order("at", { ascending: false })
    .limit(options.limit ?? 100);
  if (options.action) query = query.ilike("action", `%${options.action}%`);
  return unwrap(await query);
}

export async function listAppConfig(client: TekoClient): Promise<TableRow<"app_config">[]> {
  return unwrap(await client.from("app_config").select("*").order("key"));
}

export async function updateAppConfig(client: TekoClient, key: string, value: Json): Promise<void> {
  unwrap(await client.from("app_config").update({ value }).eq("key", key));
}

// --- Tableau de bord (A-02) -------------------------------------------------

export interface DashboardCounts {
  activeRides: number;
  onlineDrivers: number;
  pendingKyc: number;
  openIncidents: number;
}

export async function dashboardCounts(client: TekoClient): Promise<DashboardCounts> {
  const [rides, presence, kyc, incidents] = await Promise.all([
    client
      .from("rides")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "accepted", "enroute", "arrived", "started"]),
    client.from("driver_presence").select("driver_id", { count: "exact", head: true }),
    client.from("drivers").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
    client.from("incidents").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  for (const r of [rides, presence, kyc, incidents]) {
    if (r.error) throw mapApiError(r.error);
  }
  return {
    activeRides: rides.count ?? 0,
    onlineDrivers: presence.count ?? 0,
    pendingKyc: kyc.count ?? 0,
    openIncidents: incidents.count ?? 0,
  };
}

export async function listRecentRides(
  client: TekoClient,
  limit = 20,
): Promise<TableRow<"rides">[]> {
  return unwrap(
    await client.from("rides").select("*").order("created_at", { ascending: false }).limit(limit),
  );
}
