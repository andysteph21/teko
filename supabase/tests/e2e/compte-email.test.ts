// Compte par e-mail (lot R1, décisions du 23 novembre 2026) : l'invitation se
// prouve par une identité VÉRIFIÉE par Auth (e-mail ou numéro), jamais par
// un champ de profil ; le numéro devient un contact déclaré, sans unicité.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestUser,
  admin,
  allOffline,
  createDriver,
  createUser,
  goOnline,
  pendingOffer,
  requestRide,
  serviceSql,
  DEST,
  ORIGIN,
} from "./helpers";

let ops: TestUser;
afterAll(allOffline);
beforeAll(async () => {
  await allOffline();
  ops = await createUser({ role: "admin", adminRole: "ops" });
});

const quoteFor = (id: string) =>
  admin.rpc("create_ride_quote", {
    p_client: id,
    p_category: "eco",
    p_origin: ORIGIN,
    p_dest: DEST,
    p_distance_m: 3200,
    p_duration_s: 720,
    p_shape: "fixture",
  });

describe("invitation par e-mail vérifié", () => {
  it("un compte sans téléphone entre dans l'alpha dès qu'Ops invite son e-mail, et en sort à la révocation", async () => {
    const user = await createUser({ emailOnly: true, invited: false });
    expect((await user.client.rpc("is_alpha_invited", { p_role: "client" })).data).toBe(false);
    expect((await quoteFor(user.id)).error?.code).toBe("42501");

    const invited = await ops.client.rpc("invite_alpha_email", {
      p_email: `  ${user.email.toUpperCase()} `,
      p_role: "client",
    });
    expect(invited.error).toBeNull();
    expect(invited.data.email).toBe(user.email);
    expect((await user.client.rpc("is_alpha_invited", { p_role: "client" })).data).toBe(true);
    expect((await quoteFor(user.id)).error).toBeNull();

    await ops.client.rpc("invite_alpha_email", { p_email: user.email, p_role: "client", p_active: false });
    expect((await quoteFor(user.id)).error?.code).toBe("42501");
  });

  it("seul Ops invite ; une adresse invalide est refusée", async () => {
    const stranger = await createUser({ emailOnly: true, invited: false });
    const self = await stranger.client.rpc("invite_alpha_email", {
      p_email: stranger.email,
      p_role: "client",
    });
    expect(self.error?.code).toBe("42501");
    const bad = await ops.client.rpc("invite_alpha_email", { p_email: "pas-une-adresse", p_role: "client" });
    expect(bad.error?.code).toBe("22023");
  });

  it("un e-mail non vérifié, ou recopié dans le profil, n'ouvre pas l'invitation d'un autre", async () => {
    const email = `e2e-${randomUUID()}@test.teko.ga`;
    await serviceSql("insert into public.alpha_invites(email,role) values($1,'client')", [email]);
    const unverified = await admin.auth.admin.createUser({ email, email_confirm: false });
    expect(unverified.error).toBeNull();
    expect((await quoteFor(unverified.data.user!.id)).error?.code).toBe("42501");

    const stranger = await createUser({ emailOnly: true, invited: false });
    const copied = await stranger.client.from("profiles").update({ email }).eq("id", stranger.id);
    expect(copied.error).toBeNull();
    expect((await stranger.client.rpc("is_alpha_invited", { p_role: "client" })).data).toBe(false);
    await admin.auth.admin.deleteUser(unverified.data.user!.id);
  });

  it("la garde de création de compte n'accepte qu'une adresse ou un numéro invité", async () => {
    const email = `e2e-${randomUUID()}@test.teko.ga`;
    const refused = await serviceSql("select public.alpha_before_user_created($1::jsonb) as r", [
      JSON.stringify({ user: { email } }),
    ]);
    expect(refused.rows[0].r.error.http_code).toBe(403);
    await serviceSql("insert into public.alpha_invites(email,role) values($1,'driver')", [email]);
    const accepted = await serviceSql("select public.alpha_before_user_created($1::jsonb) as r", [
      JSON.stringify({ user: { email: email.toUpperCase() } }),
    ]);
    expect(accepted.rows[0].r).toEqual({});
  });
});

describe("numéro de contact déclaré", () => {
  it("normalisé à l'écriture, tracé, et partageable entre deux comptes", async () => {
    const a = await createUser({ emailOnly: true });
    const b = await createUser({ emailOnly: true });
    const first = await a.client.rpc("update_contact_phone", { p_phone: "+241 07 12 34 56" });
    expect(first.error).toBeNull();
    expect(first.data).toBe("24107123456");
    const second = await b.client.rpc("update_contact_phone", { p_phone: "24107123456" });
    expect(second.error).toBeNull();
    const rows = await serviceSql("select phone from public.profiles where id = any($1::uuid[])", [
      [a.id, b.id],
    ]);
    expect(rows.rows.map((r) => r.phone)).toEqual(["24107123456", "24107123456"]);
    const audit = await serviceSql(
      "select count(*)::int as n from public.audit_log where action='contact_phone_changed' and actor = any($1::uuid[])",
      [[a.id, b.id]],
    );
    expect(audit.rows[0].n).toBe(2);
    expect((await a.client.rpc("update_contact_phone", { p_phone: "12" })).error?.code).toBe("22023");
  });

  it("déclarer le numéro d'un invité ne donne pas son invitation", async () => {
    const invited = await createUser();
    const real = await admin.auth.admin.getUserById(invited.id);
    const stranger = await createUser({ emailOnly: true, invited: false });
    await stranger.client.rpc("update_contact_phone", { p_phone: real.data.user!.phone! });
    expect((await stranger.client.rpc("is_alpha_invited", { p_role: "client" })).data).toBe(false);
  });
});

describe("dispatch", () => {
  it("un chauffeur dont l'invitation est retirée ne reçoit plus d'offre, même encore en ligne", async () => {
    const passenger = await createUser();
    const driver = await createDriver(["eco"]);
    await goOnline(driver, 9.4537, 0.4033);
    await serviceSql(
      `update public.alpha_invites i set is_active=false from auth.users u
        where u.id=$1 and i.phone=regexp_replace(u.phone,'[^0-9]','','g') and i.role='driver'`,
      [driver.id],
    );
    const ride = await requestRide(passenger.client);
    await serviceSql("select public.retry_alpha_dispatch()");
    expect(await pendingOffer(driver, ride.id)).toBeNull();
    await passenger.client.rpc("cancel_ride", { p_ride: ride.id });
  });
});
