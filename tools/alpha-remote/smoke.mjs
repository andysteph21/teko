// Vérifie les accès en passant par la passerelle, sans clés privilégiées.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const local = resolve(root, ".local/alpha-remote");
const require = createRequire(resolve(root, "supabase/tests/e2e/package.json"));
const { createClient } = require("@supabase/supabase-js");
const origin = process.env.TEKO_REMOTE_ALPHA_ORIGIN ?? "http://127.0.0.1:58480";
const key = readFileSync(resolve(local, "anon-key"), "utf8").trim();
const accounts = JSON.parse(readFileSync(resolve(local, "accounts.json"), "utf8"));
const account = accounts.find(({ role }) => role === "client");
const client = createClient(origin, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const request = (path, options = {}) =>
  fetch(`${origin}${path}`, { signal: AbortSignal.timeout(12000), ...options });
assert.equal(await (await request("/health")).text(), "teko-alpha-remote");
assert.equal((await request("/auth/v1/admin/users")).status, 404);
assert.equal((await request("/functions/v1/notify-push", { method: "POST" })).status, 404);
assert.equal((await request("/functions/v1/price-quote", { method: "POST" })).status, 401);
assert.equal((await request("/install/teko-passager.apk")).status, 401);
const ops = accounts.find(({ role }) => role === "ops");
const opsLogin = await request("/auth/v1/verify", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ phone: `+${ops.phone}`, token: ops.code, type: "sms" }),
});
assert.equal(opsLogin.status, 400, "Un compte Ops ne doit pas entrer par la passerelle mobile");

// Un jeton fabriqué avec le secret public par défaut de la CLI ne doit rien ouvrir.
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const claims = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role: "service_role", exp: 1999999999 })}`;
const signature = createHmac("sha256", "super-secret-jwt-token-with-at-least-32-characters-long")
  .update(claims)
  .digest("base64url");
const forged = await request("/rest/v1/profiles?select=id", {
  headers: { apikey: key, authorization: `Bearer ${claims}.${signature}` },
});
assert.equal(forged.status, 401);

const start = await client.auth.signInWithOtp({
  phone: `+${account.phone}`,
  options: { shouldCreateUser: false },
});
assert.ok(!start.error, "Demande d'OTP de fixture refusée");
const wrongCode = account.code === "123456" ? "000000" : "123456";
const wrong = await client.auth.verifyOtp({
  phone: `+${account.phone}`,
  token: wrongCode,
  type: "sms",
});
assert.ok(wrong.error, "Code de banc USB ou mauvais code accepté");
const login = await client.auth.verifyOtp({
  phone: `+${account.phone}`,
  token: account.code,
  type: "sms",
});
assert.ok(login.data.session, "Connexion synthétique refusée");
const allowed = await client.rpc("is_alpha_invited", { p_role: "client" });
assert.equal(allowed.data, true);
const forbidden = await client.rpc("is_alpha_invited", { p_role: "driver" });
assert.equal(forbidden.data, false);
const channel = client.channel("alpha-smoke-ride-status").on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "rides",
    filter: `client_id=eq.${login.data.user.id}`,
  },
  () => undefined,
);
try {
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error("Realtime indisponible")), 8000);
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED" && status !== "CHANNEL_ERROR") return;
      clearTimeout(timer);
      if (status === "SUBSCRIBED") done();
      else fail(new Error("Abonnement Realtime refusé"));
    });
  });
} finally {
  await client.removeChannel(channel);
  client.realtime.disconnect();
}
const installer = await request("/install/session", {
  method: "POST",
  redirect: "manual",
  body: new URLSearchParams({ phone: account.phone, code: account.code }),
});
assert.equal(installer.status, 303);
const cookie = installer.headers.get("set-cookie");
assert.match(cookie ?? "", /HttpOnly; Secure; SameSite=Strict/);
const downloadHeaders = { cookie: cookie.split(";")[0] };
const ownPage = await request("/install", { headers: downloadHeaders });
assert.match(await ownPage.text(), /href="\/install\/teko-passager\.apk"/);
const otherApp = await request("/install/teko-chauffeur.apk", { headers: downloadHeaders });
assert.equal(otherApp.status, 403);
const quote = await client.functions.invoke("price-quote", {
  body: {
    category: "eco",
    origin: { lon: 9.4544, lat: 0.4035 },
    destination: { lon: 9.4671, lat: 0.4148 },
  },
});
assert.ok(
  quote.data?.id,
  `Devis réel indisponible : ${quote.error?.message ?? "réponse invalide"}`,
);
const tiles = await (await request("/gabon")).json();
assert.ok(tiles.tiles?.some((url) => url.startsWith(`${origin}/gabon/`)));
console.info(
  "Passerelle vérifiée : accès, OTP, téléchargement, Realtime, devis Valhalla et tuiles.",
);
