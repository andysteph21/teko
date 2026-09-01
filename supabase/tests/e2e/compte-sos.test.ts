// Cycle de vie du compte et sécurité des personnes (E-04/05/06/08/09/10/14) :
// favoris, partage de trajet public, SOS/incidents, suppression + purge,
// invitations admin, validation KYC, re-vérification d'inactivité.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  allOffline,
  API_URL,
  createDriver,
  createUser,
  goOnline,
  point,
  requestRide,
  serviceSql,
  type TestUser,
} from "./helpers";

// Runtime de fonctions alternatif (code non encore servi par la stack locale).
const FUNCTIONS_URL = process.env.TEKO_FUNCTIONS_URL ?? `${API_URL}/functions/v1`;

const anon = createClient(
  process.env.SUPABASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:54321",
  (process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY)!,
  { auth: { persistSession: false } },
);

let nadia: TestUser;
let boris: TestUser;
let ops: TestUser;
let superadmin: TestUser;
let rideId: string;

beforeAll(async () => {
  nadia = await createUser();
  boris = await createDriver(["eco"]);
  ops = await createUser({ role: "admin", adminRole: "ops" });
  superadmin = await createUser({ role: "admin", adminRole: "superadmin" });
  await goOnline(boris, 9.4535, 0.4031);
  const ride = await requestRide(nadia.client);
  await boris.client.rpc("accept_ride", { p_ride: ride.id });
  rideId = ride.id;
});

afterAll(allOffline);

describe("lieux favoris (E-06)", () => {
  it("Nadia enregistre « Maison » ; personne d'autre ne la voit", async () => {
    const ins = await nadia.client.from("saved_places").insert({
      user_id: nadia.id,
      kind: "home",
      label: "Maison",
      geom: point(9.451, 0.401),
      hint: "portail bleu",
    });
    expect(ins.error).toBeNull();
    const mine = await nadia.client.from("saved_places").select("label");
    expect(mine.data).toHaveLength(1);
    const theirs = await boris.client.from("saved_places").select("label");
    expect(theirs.data).toHaveLength(0);
  });
});

describe("partage de trajet (E-05)", () => {
  let token: string;

  it("un participant crée un lien de partage à jeton", async () => {
    const { data, error } = await nadia.client.rpc("create_trip_share", {
      p_ride: rideId,
    });
    expect(error).toBeNull();
    token = data.token;
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it("le lien s'ouvre sans compte : vue minimale, sans identifiants", async () => {
    const { data, error } = await anon.rpc("get_shared_trip", {
      p_token: token,
    });
    expect(error).toBeNull();
    expect(data.status).toBe("accepted");
    expect(data.category).toBe("eco");
    expect(JSON.stringify(data)).not.toMatch(/phone|client_id|driver_id/);
  });

  it("jeton inconnu → rien", async () => {
    const { data } = await anon.rpc("get_shared_trip", { p_token: "0".repeat(32) });
    expect(data).toBeNull();
  });
});

describe("SOS et incidents (E-05/E-08)", () => {
  it("SOS : incident créé, événement de course tracé, admins ops alertés", async () => {
    const { data, error } = await nadia.client.rpc("report_incident", {
      p_kind: "sos",
      p_ride: rideId,
    });
    expect(error).toBeNull();
    expect(data.status).toBe("open");

    const ev = await serviceSql(
      `select 1 from public.ride_events where ride_id = $1 and type = 'sos'`,
      [rideId],
    );
    expect(ev.rows).toHaveLength(1);
    const alert = await serviceSql(
      `select 1 from public.notifications where user_id = $1 and type = 'sos_alert'`,
      [ops.id],
    );
    expect(alert.rows).toHaveLength(1);
  });

  it("l'admin voit et résout l'incident ; le reporter suit le statut", async () => {
    const list = await ops.client
      .from("incidents")
      .select("id, kind")
      .eq("reporter", nadia.id);
    expect(list.data?.length).toBeGreaterThan(0);
    const upd = await ops.client
      .from("incidents")
      .update({ status: "resolved", resolution_note: "Fausse alerte confirmée au téléphone", resolved_at: new Date().toISOString() })
      .eq("id", list.data![0].id)
      .select();
    expect(upd.error).toBeNull();
    const mine = await nadia.client
      .from("incidents")
      .select("status")
      .eq("id", list.data![0].id);
    expect(mine.data![0].status).toBe("resolved");
  });

  it("un non-participant ne peut pas déclencher un SOS sur la course", async () => {
    const paul = await createUser();
    const { error } = await paul.client.rpc("report_incident", {
      p_kind: "sos",
      p_ride: rideId,
    });
    expect(error?.message).toMatch(/participants/i);
  });
});

describe("suppression de compte (E-04)", () => {
  it("demande → fenêtre de 30 j ; rétractation possible", async () => {
    const u = await createUser();
    const req = await u.client.rpc("request_account_deletion", {});
    expect(req.error).toBeNull();
    // Le RPC renvoie la date de PURGE (fin de la fenêtre, J+30) — pas celle
    // de la demande : l'écran « Compte désactivé » l'affiche telle quelle.
    const purgeMs = new Date(req.data as string).getTime();
    expect(purgeMs - Date.now()).toBeGreaterThan(29 * 24 * 3_600_000);
    expect(purgeMs - Date.now()).toBeLessThan(31 * 24 * 3_600_000);
    let row = await serviceSql(
      `select deletion_requested_at from public.profiles where id = $1`,
      [u.id],
    );
    expect(row.rows[0].deletion_requested_at).not.toBeNull();

    const cancel = await u.client.rpc("cancel_account_deletion", {});
    expect(cancel.error).toBeNull();
    row = await serviceSql(
      `select deletion_requested_at from public.profiles where id = $1`,
      [u.id],
    );
    expect(row.rows[0].deletion_requested_at).toBeNull();
  });

  it("impossible pendant une course active", async () => {
    const { error } = await nadia.client.rpc("request_account_deletion", {});
    expect(error?.message).toMatch(/course est en cours/i);
  });

  it("après 30 j : purge anonymisante, données financières conservées", async () => {
    const u = await createUser();
    await u.client.rpc("request_account_deletion", {});
    await serviceSql(
      `update public.profiles set deletion_requested_at = now() - interval '31 days' where id = $1`,
      [u.id],
    );
    const purged = await serviceSql(`select public.purge_deleted_accounts() as n`);
    expect(Number(purged.rows[0].n)).toBeGreaterThanOrEqual(1);
    const row = await serviceSql(
      `select full_name, phone, email, deleted_at from public.profiles where id = $1`,
      [u.id],
    );
    expect(row.rows[0].full_name).toBe("Compte supprimé");
    expect(row.rows[0].phone).toBeNull();
    expect(row.rows[0].email).toBeNull();
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  it("après la purge : l'identité auth est désactivée (Edge Function account-purge)", async () => {
    // Trou constaté le 1er sept. 2026 : un compte purgé restait utilisable.
    const u = await createUser();
    await u.client.rpc("request_account_deletion", {});
    await serviceSql(
      `update public.profiles set deletion_requested_at = now() - interval '31 days' where id = $1`,
      [u.id],
    );
    await serviceSql(`select public.purge_deleted_accounts()`);
    const pending = await serviceSql(`select id from public.pending_auth_purges() as t(id)`);
    expect(pending.rows.map((r) => r.id)).toContain(u.id);

    // Déclencheur explicite (le webhook pg_net fait la même chose, en asynchrone).
    const res = await fetch(`${FUNCTIONS_URL}/account-purge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "e2e" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { failed: unknown[] };
    expect(body.failed).toEqual([]);

    const auth = await serviceSql(
      `select deleted_at, email from auth.users where id = $1`,
      [u.id],
    );
    expect(auth.rows[0].deleted_at).not.toBeNull();
    expect(auth.rows[0].email).not.toBe(u.email); // identifiant obfusqué → réinscription possible
    const still = await serviceSql(`select id from public.pending_auth_purges() as t(id)`);
    expect(still.rows.map((r) => r.id)).not.toContain(u.id);

    // La session existante ne se renouvelle plus.
    const refreshed = await u.client.auth.refreshSession();
    expect(refreshed.error).not.toBeNull();
  });
});

describe("équipe admin (E-09) et KYC (E-14)", () => {
  it("invitation superadmin → réclamée à l'inscription du numéro", async () => {
    const phone = `241070${String(Math.floor(Math.random() * 900000) + 100000)}`;
    const inv = await superadmin.client.rpc("invite_admin", {
      p_phone: phone,
      p_role: "carto",
    });
    expect(inv.error).toBeNull();

    const created = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      password: "e2e-Passw0rd!",
    });
    expect(created.error).toBeNull();
    const prof = await serviceSql(
      `select role, admin_role from public.profiles where id = $1`,
      [created.data.user!.id],
    );
    expect(prof.rows[0]).toEqual({ role: "admin", admin_role: "carto" });
    const claimed = await serviceSql(
      `select accepted_by from public.admin_invites where id = $1`,
      [inv.data.id],
    );
    expect(claimed.rows[0].accepted_by).toBe(created.data.user!.id);
  });

  it("invitation E.164 avec « + » (format console) : normalisée puis réclamée", async () => {
    // Bug réel A-08 : la console envoyait « +241… », GoTrue expose new.phone
    // sans « + » — l'invitation restait non réclamée, l'invité restait client.
    const national = `071${String(Math.floor(Math.random() * 900000) + 100000)}`;
    const inv = await superadmin.client.rpc("invite_admin", {
      p_phone: `+241 ${national}`,
      p_role: "finance",
    });
    expect(inv.error).toBeNull();
    expect(inv.data.phone).toBe(`241${national}`);

    const created = await admin.auth.admin.createUser({
      phone: `241${national}`,
      phone_confirm: true,
      password: "e2e-Passw0rd!",
    });
    expect(created.error).toBeNull();
    const prof = await serviceSql(
      `select role, admin_role from public.profiles where id = $1`,
      [created.data.user!.id],
    );
    expect(prof.rows[0]).toEqual({ role: "admin", admin_role: "finance" });
    const claimed = await serviceSql(
      `select accepted_at from public.admin_invites where id = $1`,
      [inv.data.id],
    );
    expect(claimed.rows[0].accepted_at).not.toBeNull();
  });

  it("ré-inviter le même numéro : pas de doublon, rôle et expiration rafraîchis", async () => {
    const phone = `241072${String(Math.floor(Math.random() * 900000) + 100000)}`;
    const first = await superadmin.client.rpc("invite_admin", {
      p_phone: phone,
      p_role: "ops",
    });
    expect(first.error).toBeNull();
    const second = await superadmin.client.rpc("invite_admin", {
      p_phone: `+${phone}`,
      p_role: "carto",
    });
    expect(second.error).toBeNull();
    expect(second.data.id).toBe(first.data.id);
    const rows = await serviceSql(
      `select admin_role from public.admin_invites where phone = $1 and accepted_at is null`,
      [phone],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].admin_role).toBe("carto");
  });

  it("numéro illisible refusé par la garde serveur", async () => {
    const { error } = await superadmin.client.rpc("invite_admin", {
      p_phone: "+241 xx",
      p_role: "ops",
    });
    expect(error?.message).toMatch(/numéro de téléphone invalide/i);
  });

  it("un simple admin ops ne peut pas inviter", async () => {
    const { error } = await ops.client.rpc("invite_admin", {
      p_phone: "24107999999",
      p_role: "ops",
    });
    expect(error?.message).toMatch(/superadmin/i);
  });

  it("validate_kyc : onboarding self-service puis validation ops → rôle driver", async () => {
    const candidate = await createUser();
    const ins = await candidate.client
      .from("drivers")
      .insert({ id: candidate.id, categories: ["moto"] });
    expect(ins.error).toBeNull();

    const val = await ops.client.rpc("validate_kyc", {
      p_driver: candidate.id,
      p_accept: true,
    });
    expect(val.error).toBeNull();
    const row = await serviceSql(
      `select d.kyc_status, d.is_active, p.role
         from public.drivers d join public.profiles p on p.id = d.id
        where d.id = $1`,
      [candidate.id],
    );
    expect(row.rows[0]).toEqual({ kyc_status: "validated", is_active: true, role: "driver" });
    const notif = await serviceSql(
      `select 1 from public.notifications where user_id = $1 and type = 'kyc_validated'`,
      [candidate.id],
    );
    expect(notif.rows).toHaveLength(1);
  });
});

describe("re-vérification après inactivité (E-10)", () => {
  it("30 j sans activité → needs_reverification ; touch_last_seen réarme", async () => {
    const u = await createUser();
    let r = await u.client.rpc("needs_reverification", {});
    expect(r.data).toBe(false);
    await serviceSql(
      `update public.profiles set last_seen_at = now() - interval '31 days' where id = $1`,
      [u.id],
    );
    r = await u.client.rpc("needs_reverification", {});
    expect(r.data).toBe(true);
    await u.client.rpc("touch_last_seen", {});
    r = await u.client.rpc("needs_reverification", {});
    expect(r.data).toBe(false);
  });
});
