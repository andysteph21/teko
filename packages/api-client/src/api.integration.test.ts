// Tests d'intégration — stack Supabase locale réelle (supabase start).
// Sautés sans stack (CI : maps-ci les lance). Attrapent ce que les mocks ne
// voient pas : noms de colonnes des order/select, config auth téléphone,
// contrats PostgREST réels (vécu : order("requested_at") sur rides).

import { beforeAll, describe, expect, it } from "vitest";
import { signInWithPhoneOtp, verifyPhoneOtp } from "./auth";
import { createTekoClient, type TekoClient } from "./client";
import { listMyLedger, listMyStatements } from "./finance";
import { listNotifications } from "./notifications";
import { estimatePrice, listMyRides } from "./rides";

const API_URL = process.env.SUPABASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY;
const hasStack = Boolean(ANON_KEY);

// Numéro de test de supabase/config.toml (code fixe, aucun SMS réel).
const TEST_PHONE = "+24107000001";
const TEST_OTP = "123456";

describe.skipIf(!hasStack)("api-client ↔ stack locale", () => {
  let client: TekoClient;

  beforeAll(async () => {
    client = createTekoClient({ url: API_URL, anonKey: ANON_KEY as string });
    await signInWithPhoneOtp(client, TEST_PHONE);
    const session = await verifyPhoneOtp(client, TEST_PHONE, TEST_OTP);
    expect(session.access_token).toBeTruthy();
  });

  it("estimatePrice répond un montant réel par catégorie", async () => {
    const eco = await estimatePrice(client, { category: "eco", distanceM: 3190, durationS: 318 });
    const moto = await estimatePrice(client, { category: "moto", distanceM: 3190, durationS: 318 });
    expect(eco).toBeGreaterThan(0);
    expect(moto).toBeGreaterThan(0);
    expect(moto).not.toBe(eco);
  });

  it("les listes RLS-scopées répondent sans erreur de colonne", async () => {
    // Un mauvais nom de colonne dans order() → 400 PostgREST → throw.
    await expect(listMyRides(client, 5)).resolves.toBeInstanceOf(Array);
    await expect(listMyLedger(client, 5)).resolves.toBeInstanceOf(Array);
    await expect(listMyStatements(client, 5)).resolves.toBeInstanceOf(Array);
    await expect(listNotifications(client, { limit: 5 })).resolves.toBeInstanceOf(Array);
    await expect(listNotifications(client, { unreadOnly: true })).resolves.toBeInstanceOf(Array);
  });
});
