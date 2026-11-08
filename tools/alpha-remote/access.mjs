// Point d'entrée de l'essai : OTP bornés et téléchargement par rôle invité.
import { randomBytes } from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const upstream = "http://supabase_kong_teko-alpha-remote:8000";
const accounts = new Map(Object.entries(JSON.parse(readFileSync("/config/phones.json", "utf8"))));
const key = readFileSync("/config/anon-key", "utf8").trim();
const files = { client: "teko-passager.apk", driver: "teko-chauffeur.apk" };
const attempts = new Map();
const sessions = new Map();
const windowMs = 10 * 60_000;
const sessionMs = 5 * 60_000;
const headers = { apikey: key, "content-type": "application/json" };

function reply(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2048) throw new Error("Requête trop longue");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function reserve(phone, operation) {
  const index = `${phone}:${operation}`;
  const now = Date.now();
  const previous = attempts.get(index);
  const entry = previous?.until > now ? previous : { until: now + windowMs, count: 0 };
  if (entry.count >= 8) return false;
  entry.count += 1;
  attempts.set(index, entry);
  return true;
}

async function auth(operation, input) {
  const phone = typeof input.phone === "string" ? input.phone.replace(/^\+/, "") : "";
  const role = accounts.get(phone);
  if (!Object.hasOwn(files, role)) return { status: 400, data: { msg: "Compte d’essai requis." } };
  const payload = { phone: `+${phone}` };
  if (operation === "verify") {
    if (typeof input.token !== "string" || !/^\d{6}$/.test(input.token)) {
      return { status: 400, data: { msg: "Code d’essai invalide." } };
    }
    Object.assign(payload, { type: "sms", token: input.token });
  } else Object.assign(payload, { channel: "sms", create_user: false });
  if (!reserve(phone, operation)) {
    return { status: 429, data: { msg: "Trop d’essais. Réessaie dans dix minutes." } };
  }
  const response = await fetch(`${upstream}/auth/v1/${operation}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, data: await response.json(), role };
}

async function isInvited(token, role) {
  const response = await fetch(`${upstream}/rest/v1/rpc/is_alpha_invited`, {
    method: "POST",
    headers: { ...headers, authorization: `Bearer ${token}` },
    body: JSON.stringify({ p_role: role }),
    signal: AbortSignal.timeout(5000),
  });
  return response.ok && (await response.json()) === true;
}

function sessionFrom(req) {
  const cookie = /(?:^|;\s*)teko_install=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? "");
  const session = cookie && sessions.get(cookie[1]);
  return session && session.until > Date.now() ? session : null;
}

function page(res, session) {
  const message = session
    ? `<p><a href="/install/${files[session.role]}">Télécharger l’application Android</a></p>`
    : `<form method="post" action="/install/session">
<label>Numéro d’essai <input name="phone" type="tel" required maxlength="14"></label>
<label>Code d’essai <input name="code" inputmode="numeric" pattern="[0-9]{6}" required></label>
<button>Accéder à l’APK</button></form>`;
  reply(
    res,
    200,
    `<!doctype html><html lang="fr"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Essai privé Teko</title><main><h1>Essai privé Teko</h1>
<p>Utilise les identifiants fictifs fournis par l’organisateur. Aucun SMS n’est envoyé.</p>
${message}</main></html>`,
    "text/html; charset=utf-8",
  );
}

async function installLogin(req, res) {
  const form = new URLSearchParams(await body(req));
  const result = await auth("verify", { phone: form.get("phone"), token: form.get("code") });
  const token = result.data.access_token;
  if (!token || !(await isInvited(token, result.role))) {
    return reply(
      res,
      result.status === 429 ? 429 : 401,
      "Invitation ou code d’essai invalide.",
      "text/plain; charset=utf-8",
    );
  }
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.until <= now) sessions.delete(id);
  }
  const id = randomBytes(32).toString("hex");
  sessions.set(id, { token, role: result.role, until: now + sessionMs });
  res.writeHead(303, {
    location: "/install",
    "cache-control": "no-store",
    "set-cookie": `teko_install=${id}; Max-Age=300; Path=/install; HttpOnly; Secure; SameSite=Strict`,
  });
  res.end();
}

async function download(req, res, pathname) {
  const session = sessionFrom(req);
  if (!session || !(await isInvited(session.token, session.role))) {
    return reply(res, 401, { msg: "Connexion d’essai requise." });
  }
  const name = files[session.role];
  if (pathname !== `/install/${name}`)
    return reply(res, 403, { msg: "Application non autorisée." });
  const path = resolve("/apks", name);
  const info = statSync(path, { throwIfNoEntry: false });
  if (!info?.isFile()) return reply(res, 404, { msg: "APK en cours de préparation." });
  res.writeHead(200, {
    "content-type": "application/vnd.android.package-archive",
    "content-length": info.size,
    "content-disposition": `attachment; filename="${name}"`,
    "cache-control": "no-store",
  });
  await pipeline(createReadStream(path), res);
}

async function handle(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (req.method === "POST" && ["/auth/v1/otp", "/auth/v1/verify"].includes(pathname)) {
    const result = await auth(pathname.split("/").at(-1), JSON.parse(await body(req)));
    return reply(res, result.status, result.data);
  }
  if (req.method === "POST" && pathname === "/install/session") return installLogin(req, res);
  if (req.method === "GET" && pathname === "/install") return page(res, sessionFrom(req));
  if (
    req.method === "GET" &&
    Object.values(files).some((name) => pathname === `/install/${name}`)
  ) {
    return download(req, res, pathname);
  }
  reply(res, 404, { msg: "Page indisponible." });
}

createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, (req, res) => {
  handle(req, res).catch(() => {
    if (res.headersSent) res.destroy();
    else reply(res, 400, { msg: "Requête d’essai indisponible." });
  });
}).listen(8081, "0.0.0.0");
