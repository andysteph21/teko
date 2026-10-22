// Outils partagés des tests e2e.
//
// Deux canaux d'accès à la base, volontairement distincts :
//  - supabase-js avec un vrai JWT utilisateur → exerce PostgREST + RLS + RPC
//    exactement comme les apps le feront ;
//  - connexion Postgres directe (rôle postgres) → seed privilégié et
//    inspection de l'état, avec le GUC `teko.service = on` pour passer les
//    gardes, comme le font les fonctions de service en production.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import pg from "pg";

export const API_URL =
  process.env.SUPABASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:54321";
export const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
const DB_URL =
  process.env.SUPABASE_DB_URL ??
  process.env.DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (process.env.TEKO_E2E_DISPOSABLE !== "teko-alpha-audit" ||
  API_URL !== "http://127.0.0.1:58321" || !DB_URL.includes(":58322/")) {
  throw new Error("Tests refusés hors du banc jetable. Utilisez node tools/audit/run-bench.mjs depuis la racine.");
}

if (!ANON_KEY || !SERVICE_KEY) {
  throw new Error(
    "ANON_KEY / SERVICE_ROLE_KEY absents. Lancez `supabase start` puis exportez `supabase status -o env`.",
  );
}

export const admin = createClient(API_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const db = new pg.Pool({ connectionString: DB_URL, max: 3 });

// Requête SQL en contexte service : gardes (`teko.service`) levées le temps
// de la transaction, comme dans les fonctions SECURITY DEFINER de service.
export async function serviceSql(text: string, params: unknown[] = []) {
  const c = await db.connect();
  try {
    await c.query("begin");
    await c.query("set local teko.service = 'on'");
    const r = await c.query(text, params);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

const fixtureUsers = new Set<string>();

// Crée un utilisateur auth confirmé + session réelle (JWT anon + password).
export async function createUser(
  opts: {
    role?: "client" | "driver" | "admin";
    adminRole?: "ops" | "carto" | "finance" | "superadmin";
    phone?: string;
    invited?: boolean;
  } = {},
): Promise<TestUser> {
  const email = `e2e-${randomUUID()}@test.teko.ga`;
  const password = "e2e-Passw0rd!";
  const phone = opts.phone ?? `24107${String(BigInt(`0x${randomUUID().replaceAll("-", "")}`) % 10000000000n).padStart(10, "0")}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    phone, phone_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  fixtureUsers.add(id);
  if (opts.invited !== false && opts.role !== "admin") {
    await serviceSql("insert into public.alpha_invites(phone,role) values($1,$2) on conflict(phone,role) do update set is_active=true",
      [phone.replace(/\D/g, ""), opts.role ?? "client"]);
  }

  if (opts.role && opts.role !== "client") {
    await serviceSql(
      `update public.profiles
          set role = $1::public.user_role,
              admin_role = $2::public.admin_role
        where id = $3`,
      [opts.role, opts.adminRole ?? null, id],
    );
  }

  const client = createClient(API_URL, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  return { id, email, client };
}

// Chauffeur prêt à rouler : rôle driver + fiche drivers validée/active.
export async function createDriver(
  categories: string[] = ["eco"],
): Promise<TestUser> {
  const u = await createUser({ role: "driver" });
  await serviceSql(
    `insert into public.drivers (id, kyc_status, is_active, categories, gps_consent)
     values ($1, 'validated', true, $2::public.vehicle_category[], true)`,
    [u.id, categories],
  );
  return u;
}

export const point = (lon: number, lat: number) =>
  `SRID=4326;POINT(${lon} ${lat})`;

// Passe un chauffeur « en ligne » (heartbeat D-09) à la position donnée —
// condition d'éligibilité au dispatch par offres.
export async function goOnline(driver: TestUser, lon: number, lat: number) {
  const { error } = await driver.client.rpc("driver_heartbeat", {
    p_point: point(lon, lat),
  });
  if (error) throw error;
}

// Repasse hors ligne les seuls utilisateurs créés par ce fichier de tests.
// À appeler en afterAll
// de chaque spec qui utilise goOnline : les fichiers partagent la même base,
// et un chauffeur resté en ligne détournerait les offres des specs suivantes.
export async function allOffline() {
  await serviceSql(`delete from public.driver_presence where driver_id = any($1::uuid[])`,
    [[...fixtureUsers]]);
}

// Offre en attente du chauffeur pour une course donnée (via RLS : il ne voit
// que les siennes).
export async function pendingOffer(driver: TestUser, rideId: string) {
  const { data, error } = await driver.client
    .from("ride_offers")
    .select("*")
    .eq("ride_id", rideId)
    .eq("status", "pending");
  if (error) throw error;
  return data[0] ?? null;
}

// Trajet de référence des maquettes : Pharmacie du Gros-Bouquet → Lycée Léon Mba.
export const ORIGIN = point(9.4536, 0.4032);
export const DEST = point(9.4671, 0.4148);
export const DISTANCE_M = 3200;
export const DURATION_S = 720;

export async function requestRide(client: SupabaseClient, extra: object = {}) {
  const identity = await client.auth.getUser();
  if (identity.error) throw identity.error;
  // Fixture de devis créée par le serveur : le parcours de routage réel est
  // testé séparément. Les mutations de course restent sous JWT utilisateur.
  const quote = await admin.rpc("create_ride_quote", {
    p_client: identity.data.user!.id, p_category: "eco", p_origin: ORIGIN,
    p_dest: DEST, p_distance_m: DISTANCE_M, p_duration_s: DURATION_S,
    p_shape: "_p~iF~ps|U_ulLnnqC_mqNvxq`@", ...extra,
  });
  if (quote.error) throw quote.error;
  const { data, error } = await client.rpc("request_quoted_ride", { p_quote: quote.data.id });
  if (error) throw error;
  return data;
}

export async function ridePin(rideId: string): Promise<string> {
  const r = await serviceSql(
    "select pin_code from private.ride_pins where ride_id = $1",
    [rideId],
  );
  return r.rows[0].pin_code;
}

// Déroule une course cash complète et retourne la ligne finale de rides.
// Le chauffeur passe en ligne près du départ : le dispatch lui adresse
// l'offre, qu'accept_ride accepte (E-01 comblé).
export async function completeCashRide(client: TestUser, driver: TestUser) {
  await goOnline(driver, 9.4535, 0.4031);
  const ride = await requestRide(client.client);
  let r = await driver.client.rpc("accept_ride", { p_ride: ride.id });
  if (r.error) throw r.error;
  r = await driver.client.rpc("mark_arrived", { p_ride: ride.id });
  if (r.error) throw r.error;
  r = await driver.client.rpc("start_ride_checked", {
    p_ride: ride.id,
    p_pin: await ridePin(ride.id),
  });
  if (r.error) throw r.error;
  if (r.data.error) throw new Error(r.data.error);
  r = await driver.client.rpc("complete_ride", { p_ride: ride.id });
  if (r.error) throw r.error;
  return r.data;
}
