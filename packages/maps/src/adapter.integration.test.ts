// Intégration TekoMapData ↔ Supabase local (mêmes clés que la suite e2e :
// `supabase start` puis `supabase status -o env`). Sauté si la stack est
// absente — la CI carte démarre la stack avant (maps-ci.yml).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client non typé par un schéma généré (les types Supabase seront générés
// dans packages/types) — on neutralise les génériques pour ce test.
type AnyClient = SupabaseClient<any, any, any>;
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TekoMapData } from "./adapter.js";
import { distanceM } from "./geo.js";

const API_URL = process.env.SUPABASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
const DB_URL = process.env.SUPABASE_DB_URL ?? process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const hasStack = Boolean(ANON_KEY && SERVICE_KEY);

const d = describe.skipIf(!hasStack);

const MONT_BOUET = { lon: 9.457, lat: 0.399 };

let db: pg.Pool;
let admin: AnyClient;
let client: AnyClient;
let driver: AnyClient;
let clientData: TekoMapData;
let driverData: TekoMapData;
let clientId: string;
let driverId: string;

async function serviceSql(text: string, params: unknown[] = []) {
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

async function makeUser(role?: "driver") {
  const email = `maps-${randomUUID()}@test.teko.ga`;
  const password = "e2e-Passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const id = data.user!.id;
  if (role === "driver") {
    await serviceSql(
      `update public.profiles set role = 'driver' where id = $1`,
      [id],
    );
    await serviceSql(
      `insert into public.drivers (id, kyc_status, is_active, categories, gps_consent)
       values ($1, 'validated', true, '{eco}'::public.vehicle_category[], true)`,
      [id],
    );
  }
  const c: AnyClient = createClient(API_URL, ANON_KEY!, { auth: { persistSession: false } });
  const { error: e2 } = await c.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id, client: c };
}

beforeAll(async () => {
  if (!hasStack) return;
  db = new pg.Pool({ connectionString: DB_URL, max: 2 });
  admin = createClient(API_URL, SERVICE_KEY!, { auth: { persistSession: false } }) as AnyClient;
  const u1 = await makeUser();
  const u2 = await makeUser("driver");
  clientId = u1.id;
  driverId = u2.id;
  client = u1.client;
  driver = u2.client;
  clientData = new TekoMapData(client);
  driverData = new TekoMapData(driver, true); // chauffeur en mode éco
});

afterAll(async () => {
  if (!hasStack) return;
  await serviceSql(`delete from public.driver_presence where driver_id = $1`, [driverId]);
  await db.end();
});

d("repères (nearest_landmarks → GeoJSON)", () => {
  it("retourne les repères seed autour de Mont-Bouët en FeatureCollection", async () => {
    const fc = await clientData.nearestLandmarks(MONT_BOUET, { maxM: 800, limit: 5 });
    expect(fc.type).toBe("FeatureCollection");
    const names = fc.features.map((f) => f.properties["name"]);
    expect(names).toContain("Marché de Mont-Bouët");
    const mb = fc.features.find((f) => f.properties["name"] === "Marché de Mont-Bouët")!;
    const [lon, lat] = mb.geometry.coordinates as [number, number];
    expect(distanceM({ lon, lat }, MONT_BOUET)).toBeLessThan(150);
  });

  it("suggère un point de rendez-vous proche (C-09)", async () => {
    const meeting = await clientData.suggestMeetingLandmark(MONT_BOUET);
    expect(meeting).not.toBeNull();
    expect(meeting!.name.length).toBeGreaterThan(0);
    expect(distanceM(meeting!.position, MONT_BOUET)).toBeLessThan(500);
  });

  it("propose_landmark crée une proposition arrondie au statut proposed", async () => {
    const res = await clientData.proposeLandmark({
      name: `Kiosque test ${randomUUID().slice(0, 8)}`,
      category: "other",
      position: { lon: 9.4612345678, lat: 0.4101234567 },
    });
    expect(res.status).toBe("proposed");
    const row = await serviceSql(
      `select extensions.st_x(geom) as lon from public.landmark_proposals where id = $1`,
      [res.id],
    );
    expect(Number(row.rows[0].lon)).toBe(9.46123); // arrondi 5 décimales
  });
});

d("présence chauffeur (heartbeat)", () => {
  it("écrit la position arrondie éco (4 décimales) dans driver_presence", async () => {
    await driverData.driverHeartbeat({ lon: 9.45367891, lat: 0.40321119 });
    const row = await serviceSql(
      `select extensions.st_x(geom) as lon, extensions.st_y(geom) as lat
         from public.driver_presence where driver_id = $1`,
      [driverId],
    );
    expect(Number(row.rows[0].lon)).toBe(9.4537);
    expect(Number(row.rows[0].lat)).toBe(0.4032);
  });
});

d("positions de course en temps réel", () => {
  it("le client reçoit via Realtime la position poussée par le chauffeur", async () => {
    // Course réelle : Nadia commande, le chauffeur (en ligne) accepte.
    const { data: ride, error } = await client.rpc("request_ride", {
      p_category: "eco",
      p_origin: "SRID=4326;POINT(9.4536 0.4032)",
      p_dest: "SRID=4326;POINT(9.4671 0.4148)",
      p_distance_m: 3200,
      p_duration_s: 720,
    });
    expect(error).toBeNull();
    if (!ride) throw new Error("ride null");
    const accept = await driver.rpc("accept_ride", { p_ride: ride.id });
    expect(accept.error).toBeNull();

    const received: Array<{ lon: number; lat: number }> = [];
    const channel = clientData.subscribeRidePositions(ride.id, (e) => received.push(e));
    // Attendre l'abonnement effectif avant de pousser.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("subscribe timeout")), 8000);
      const check = setInterval(() => {
        if (channel.state === "joined") {
          clearTimeout(t);
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

    await driverData.pushRidePosition(ride.id, { lon: 9.4562, lat: 0.4079 });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("realtime timeout — position non reçue")), 8000);
      const check = setInterval(() => {
        if (received.length > 0) {
          clearTimeout(t);
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

    expect(received[0]!.lon).toBeCloseTo(9.4562, 3);
    expect(received[0]!.lat).toBeCloseTo(0.4079, 3);
    await clientData.unsubscribe(channel);
    await driver.rpc("cancel_ride", { p_ride: ride.id, p_status: "cancelled_driver" });
  }, 30000);
});
