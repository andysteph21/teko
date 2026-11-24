// biome-ignore-all lint/style/noExcessiveLinesPerFile: La passerelle alpha monte un seul script dans son conteneur.
// Point d'entrée de l'essai : OTP bornés et téléchargement par rôle invité.
import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const upstream = "http://supabase_kong_teko-alpha-remote:8000";
const accounts = new Map(Object.entries(JSON.parse(readFileSync("/config/phones.json", "utf8"))));
const adminPath = "/config/alpha-admin.json";
const admin = existsSync(adminPath) ? JSON.parse(readFileSync(adminPath, "utf8")) : null;
const key = readFileSync("/config/anon-key", "utf8").trim();
const files = { client: "teko-passager.apk", driver: "teko-chauffeur.apk" };
const fieldAuthPaths = new Set([
  "/auth/v1/otp",
  "/auth/v1/verify",
  "/install/otp",
  "/install/session",
]);
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

function reserve(identity, operation, limit = 8) {
  const index = `${identity}:${operation}`;
  const now = Date.now();
  const previous = attempts.get(index);
  if (!previous && attempts.size >= 4096) {
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    if (attempts.size >= 4096) return false;
  }
  const entry = previous?.until > now ? previous : { until: now + windowMs, count: 0 };
  if (entry.count >= limit) return false;
  entry.count += 1;
  attempts.set(index, entry);
  return true;
}

async function auth(operation, input, operator) {
  const phone = typeof input.phone === "string" ? input.phone.replace(/^\+/, "") : "";
  let role = operator ?? accounts.get(phone);
  const field = !operator && admin?.fieldSignup === true;
  const allowed = operator
    ? Object.hasOwn(admin.operators, operator) && admin.operators[operator] === phone
    : field
      ? /^241\d{8,9}$/.test(phone) && !Object.values(admin.operators).includes(phone)
      : Object.hasOwn(files, role);
  if (!allowed) return { status: 400, data: { msg: "Numéro non autorisé." } };
  const payload = { phone: `+${phone}` };
  if (operation === "verify") {
    if (typeof input.token !== "string" || !/^\d{6}$/.test(input.token)) {
      return { status: 400, data: { msg: "Code invalide." } };
    }
    Object.assign(payload, { type: "sms", token: input.token });
  } else Object.assign(payload, { channel: "sms", create_user: field });
  if (!reserve(phone, operation)) {
    return { status: 429, data: { msg: "Trop d’essais. Réessaie dans dix minutes." } };
  }
  const response = await fetch(`${upstream}/auth/v1/${operation}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  if (field && data.access_token) {
    const roles = input.role ? [input.role] : Object.keys(files);
    const invitations = await Promise.all(
      roles.map(
        (name) =>
          typeof name === "string" &&
          Object.hasOwn(files, name) &&
          isInvited(data.access_token, name),
      ),
    );
    role = roles[invitations.indexOf(true)];
    if (!role) {
      return { status: 403, data: { msg: "Invitation requise pour ce rôle." } };
    }
    return { status: response.status, data, role };
  }
  if (field && operation === "otp" && [400, 403, 404].includes(response.status)) {
    return { status: 200, data: {} };
  }
  if (!operator && data.access_token && !(await isInvited(data.access_token, role))) {
    return { status: 403, data: { msg: "Invitation d’essai inactive." } };
  }
  return { status: response.status, data, role };
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

function page(res, session, fieldPhone) {
  const field = admin?.fieldSignup === true;
  const otpForm =
    field && !fieldPhone
      ? `<form method="post" action="/install/otp"><label>Numéro invité (+241) <input name="phone" type="tel" required pattern="\\+?241[0-9]{8,9}"></label><button>Recevoir le code</button></form>`
      : null;
  const identity = field
    ? `<input name="phone" type="hidden" value="${fieldPhone ?? ""}"><label>Application <select name="role"><option value="client">Passager</option><option value="driver">Chauffeur</option></select></label>`
    : '<label>Numéro d’essai <input name="phone" type="tel" required maxlength="14"></label>';
  const message = session
    ? `<p><a href="/install/${files[session.role]}">Télécharger l’application Android</a></p>`
    : (otpForm ??
      `<form method="post" action="/install/session">
${identity}
<label>${field ? "Code reçu par SMS" : "Code d’essai"} <input name="code" inputmode="numeric" pattern="[0-9]{6}" required></label>
<button>Accéder à l’APK</button></form>`);
  reply(
    res,
    200,
    `<!doctype html><html lang="fr"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Alpha privée Teko</title><main><h1>Alpha privée Teko</h1>
<p>${field ? "Utilisez le numéro enregistré par l’équipe Teko." : "Utilise les identifiants fictifs fournis par l’organisateur. Aucun SMS n’est envoyé."}</p>
${message}</main></html>`,
    "text/html; charset=utf-8",
  );
}

async function installLogin(req, res) {
  if (admin?.mobileClosed)
    return reply(res, 403, { msg: "Les inscriptions terrain ne sont pas ouvertes." });
  const form = new URLSearchParams(await body(req));
  const role = form.get("role");
  if (admin?.fieldSignup && !Object.hasOwn(files, role))
    return reply(res, 400, { msg: "Rôle requis." });
  const result = await auth("verify", { phone: form.get("phone"), token: form.get("code"), role });
  const token = result.data.access_token;
  if (!token) {
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

async function installOtp(req, res) {
  if (admin?.mobileClosed || !admin?.fieldSignup)
    return reply(res, 403, { msg: "Inscriptions fermées." });
  const form = new URLSearchParams(await body(req));
  const phone = form.get("phone")?.replace(/^\+/, "");
  if (!phone || !/^241\d{8,9}$/.test(phone)) return reply(res, 400, { msg: "Numéro invalide." });
  const result = await auth("otp", { phone });
  if (result.status !== 200)
    return reply(res, result.status, { msg: "Demande de code indisponible." });
  return page(res, null, phone);
}

async function download(req, res, pathname) {
  if (admin?.mobileClosed)
    return reply(res, 403, { msg: "Les inscriptions terrain ne sont pas ouvertes." });
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

async function sessionRequest(token, path, payload) {
  return fetch(`${upstream}${path}`, {
    headers: { ...headers, authorization: `Bearer ${token}` },
    method: payload ? "POST" : "GET",
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(5000),
  });
}

async function operatorSession(token, operator) {
  if (typeof token !== "string" || !Object.hasOwn(admin.operators, operator)) return false;
  const auth = await sessionRequest(token, "/auth/v1/user");
  if (!auth.ok) return false;
  const user = await auth.json();
  if (user.phone?.replace(/^\+/, "") !== admin.operators[operator]) return false;
  const profile = await sessionRequest(
    token,
    `/rest/v1/profiles?select=role,admin_role&id=eq.${encodeURIComponent(user.id)}`,
  );
  if (!profile.ok) return false;
  const [row] = await profile.json();
  return row?.role === "admin" && row.admin_role === operator;
}

let pendingAllocation = Promise.resolve();
async function allocateTester(token, { role, phone }) {
  const response = await sessionRequest(token, "/rest/v1/alpha_invites?select=phone,is_active");
  if (!response.ok) throw new Error("Liste d’invitations indisponible");
  const invites = new Map((await response.json()).map((entry) => [entry.phone, entry.is_active]));
  const account = admin.pool.find(
    (entry) =>
      entry.role === role &&
      (phone === undefined
        ? !invites.has(entry.phone)
        : entry.phone === phone && invites.get(phone)),
  );
  if (!account) return null;
  if (phone === undefined) {
    const invite = await sessionRequest(token, "/rest/v1/rpc/invite_alpha", {
      p_phone: account.phone,
      p_role: role,
      p_active: true,
    });
    if (!invite.ok) throw new Error("Invitation refusée");
  }
  if (role === "driver") {
    const driver = await sessionRequest(
      token,
      `/rest/v1/drivers?select=kyc_status&id=eq.${account.id}`,
    );
    if (!driver.ok) throw new Error("Dossier fictif indisponible");
    const [row] = await driver.json();
    if (row?.kyc_status !== "validated") {
      const result = await sessionRequest(token, "/rest/v1/rpc/validate_kyc", {
        p_driver: account.id,
        p_accept: true,
        p_note: "Dossier fictif du banc alpha",
      });
      if (!result.ok) throw new Error("Dossier fictif à vérifier");
    }
  }
  return { phone: account.phone, role, code: account.code };
}

async function adminRequest(req, res, pathname) {
  const operator = req.headers["x-teko-operator"];
  if (
    !admin ||
    req.method !== "POST" ||
    req.headers.origin !== admin.origin ||
    typeof operator !== "string" ||
    !Object.hasOwn(admin.operators, operator)
  ) {
    return reply(res, 403, { msg: "Accès privé requis." });
  }
  const input = JSON.parse(await body(req));
  if (pathname === "/admin/alpha-api/login") {
    const result = await auth("verify", { phone: input.phone, token: input.code }, operator);
    const { access_token, refresh_token } = result.data;
    if (!access_token || !(await operatorSession(access_token, operator))) {
      return reply(res, result.status === 429 ? 429 : 401, {
        msg: "Identifiants d’essai invalides.",
      });
    }
    return reply(res, 200, { access_token, refresh_token });
  }
  if (pathname !== "/admin/alpha-api/testers") return reply(res, 404, { msg: "Action inconnue." });
  const token = req.headers["x-teko-session"];
  if (operator !== "ops" || !(await operatorSession(token, operator))) {
    return reply(res, 403, { msg: "Action réservée aux opérations." });
  }
  if (admin.mobileClosed) {
    return reply(res, 409, {
      msg: "Les comptes fictifs ont été retirés. Les inscriptions terrain ne sont pas ouvertes.",
    });
  }
  if (
    !Object.hasOwn(files, input.role) ||
    (input.phone !== undefined && typeof input.phone !== "string")
  ) {
    return reply(res, 400, { msg: "Compte de test invalide." });
  }
  const allocation = pendingAllocation.then(() => allocateTester(token, input));
  pendingAllocation = allocation.catch(() => {});
  try {
    const account = await allocation;
    if (account) return reply(res, 200, account);
    return reply(res, 409, {
      msg:
        input.phone === undefined
          ? "Réserve épuisée pour ce rôle."
          : "Invitation de test inactive.",
    });
  } catch {
    return reply(res, 503, {
      msg: "Création incomplète. Vérifiez la liste des invitations avant de réessayer.",
    });
  }
}

async function handle(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname.startsWith("/admin/alpha-api/")) return adminRequest(req, res, pathname);
  if (admin?.fieldSignup && req.method === "POST" && fieldAuthPaths.has(pathname)) {
    const address = req.headers["x-teko-client-ip"];
    if (typeof address !== "string" || !reserve(address, "terrain", 30)) {
      return reply(res, 429, { msg: "Trop d’essais. Réessayez dans dix minutes." });
    }
  }
  if (req.method === "POST" && ["/auth/v1/otp", "/auth/v1/verify"].includes(pathname)) {
    if (admin?.mobileClosed)
      return reply(res, 403, { msg: "Les inscriptions terrain ne sont pas ouvertes." });
    const result = await auth(pathname.split("/").at(-1), JSON.parse(await body(req)));
    return reply(res, result.status, result.data);
  }
  if (req.method === "POST" && pathname === "/install/session") return installLogin(req, res);
  if (req.method === "POST" && pathname === "/install/otp") return installOtp(req, res);
  if (req.method === "GET" && pathname === "/install") {
    if (admin?.mobileClosed) {
      return reply(
        res,
        200,
        '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Teko Move · Alpha privée</title><main><h1>Teko Move · Alpha privée</h1><p>Les inscriptions terrain ne sont pas encore ouvertes.</p></main>',
        "text/html; charset=utf-8",
      );
    }
    return page(res, sessionFrom(req));
  }
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
