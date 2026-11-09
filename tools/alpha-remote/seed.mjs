// Initialise uniquement les quatre comptes fictifs de l'essai distant.
import { execFileSync } from "node:child_process";
import { randomInt, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const root = resolve(import.meta.dirname, "../..");
const workdir = resolve(root, ".local/alpha-remote");
const require = createRequire(resolve(root, "supabase/tests/e2e/package.json"));
const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");
const status = parseEnv(
  execFileSync("supabase", ["status", "--workdir", workdir, "-o", "env"], { encoding: "utf8" }),
);
if (status.API_URL !== "http://127.0.0.1:58421" || !status.DB_URL?.includes(":58422/")) {
  throw new Error("Essai distant isolé requis");
}
const db = new Client({ connectionString: status.DB_URL });
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, authOptions);
const accounts = JSON.parse(readFileSync(resolve(workdir, "accounts.json"), "utf8"));
const poolPath = resolve(workdir, "alpha-admin.json");
const adminPool = process.argv[2] === "--admin-pool";
const campaign = process.argv[2] === "--campaign";
const functions = parseEnv(readFileSync(resolve(workdir, "functions.env"), "utf8"));

async function seedAccount({ role, phone }) {
  const existing = await db.query("select id from auth.users where phone=$1", [phone]);
  let id = existing.rows[0]?.id;
  if (!id) {
    const result = await admin.auth.admin.createUser({ phone, phone_confirm: true });
    if (result.error) throw result.error;
    id = result.data.user.id;
  }
  const adminRole = ["ops", "finance"].includes(role) ? role : null;
  await db.query("begin");
  await db.query("set local teko.service='on'");
  await db.query("update public.profiles set role=$2, full_name=$3, admin_role=$4 where id=$1", [
    id,
    adminRole ? "admin" : role,
    `Essai Teko · ${role}`,
    adminRole,
  ]);
  await db.query("commit");
  return id;
}

async function signIn(role) {
  const { phone, code } = accounts.find((account) => account.role === role);
  const client = createClient(status.API_URL, status.ANON_KEY, authOptions);
  const result = await client.auth.verifyOtp({ phone: `+${phone}`, token: code, type: "sms" });
  if (result.error) throw result.error;
  return client;
}

async function seedDocuments(driver, client, ops, finalize = true) {
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=",
    "base64",
  );
  for (const type of [
    "id_card",
    "license",
    "registration",
    "insurance",
    "vehicle_photo",
    "criminal_record",
    "profile_photo",
  ]) {
    const path = `${driver}/${type}-${finalize ? randomUUID() : "alpha-fixture"}.png`;
    const existing = await db.query(
      "select id,status from public.driver_documents where storage_path=$1",
      [path],
    );
    let documentId = existing.rows[0]?.id;
    if (existing.rows[0]?.status === "validated") continue;
    if (!documentId) {
      const upload = await client.storage
        .from("kyc")
        .upload(path, image, { contentType: "image/png", upsert: !finalize });
      if (upload.error) throw upload.error;
      const document = await client
        .from("driver_documents")
        .insert({ driver_id: driver, type, storage_path: path })
        .select("id")
        .single();
      if (document.error) throw document.error;
      documentId = document.data.id;
    }
    const review = await ops
      .from("driver_documents")
      .update({ status: "validated", note: "Fictif" })
      .eq("id", documentId);
    if (review.error) throw review.error;
  }
  const verification = await db.query("select physical_verified_at from public.drivers where id=$1", [driver]);
  if (!verification.rows[0]?.physical_verified_at) {
    const physical = await ops.rpc("record_physical_verification", {
      p_driver: driver,
      p_note: "Donnée fictive de l’essai distant",
    });
    if (physical.error) throw physical.error;
  }
  if (!finalize) return;
  const validation = await ops.rpc("validate_kyc", {
    p_driver: driver,
    p_accept: true,
    p_note: "Donnée fictive de l’essai distant",
  });
  if (validation.error) throw validation.error;
}

async function seedVehicle(id, plate) {
  await db.query(
    "insert into public.drivers(id,categories,gps_consent) values($1,'{eco}',false) on conflict do nothing",
    [id],
  );
  await db.query(
    "insert into public.vehicles(driver_id,category,plate) values($1,'eco',$2) on conflict do nothing",
    [id, plate],
  );
}

function saveAllowlist(mobileAccounts) {
  const phones = Object.fromEntries(
    mobileAccounts
      .filter(({ role }) => ["client", "driver"].includes(role))
      .map(({ phone, role }) => [phone, role]),
  );
  writeFileSync(resolve(workdir, "phones.json"), `${JSON.stringify(phones)}\n`, { mode: 0o600 });
}

async function seedPool() {
  const configPath = resolve(workdir, "supabase/config.toml");
  const codes = new Set(["123456", ...accounts.map(({ code }) => code)]);
  let config;
  try {
    config = JSON.parse(readFileSync(poolPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    config = {
      origin: "https://alpha.tekomove.com",
      operators: Object.fromEntries(
        accounts.filter(({ role }) => ["ops", "finance"].includes(role)).map(({ role, phone }) => [role, phone]),
      ),
      pool: [],
    };
  }
  if (!config.pool.length) {
    if (campaign && !config.mobileClosed) throw new Error("Fermer le banc avant de préparer la campagne");
    config.pool = Array.from({ length: campaign ? 15 : 24 }, (_, index) => {
        let code;
        do code = String(randomInt(100000, 1000000)); while (codes.has(code));
        codes.add(code);
        return { role: index < (campaign ? 5 : 12) ? "client" : "driver", phone: `241000009${(campaign ? 150 : 100) + index}`, code };
    });
    writeFileSync(poolPath, JSON.stringify(config), { mode: 0o600 });
  }
  if (campaign && (config.pool.length !== 15 || config.pool.filter(({role}) => role === "driver").length !== 10)) {
    throw new Error("Campagne attendue : dix chauffeurs et cinq passagers");
  }
  const ops = await signIn("ops");
  for (const account of config.pool) {
    if (!/^2410000091\d{2}$/.test(account.phone) || !["client", "driver"].includes(account.role)) {
      throw new Error("Compte hors de la réserve fictive");
    }
    account.id ??= await seedAccount(account);
    if (account.role === "driver") {
      await seedVehicle(account.id, `TEST-${account.phone.slice(-3)}`);
      await seedDocuments(account.id, admin, ops, false);
    }
    if (campaign) {
      const invite = await ops.rpc("invite_alpha", {p_phone: account.phone, p_role: account.role, p_active: true});
      if (invite.error) throw invite.error;
      if (account.role === "driver") {
        const validation = await ops.rpc("validate_kyc", {p_driver: account.id, p_accept: true, p_note: "Campagne fictive sans SMS"});
        if (validation.error) throw validation.error;
      }
    }
  }
  writeFileSync(poolPath, JSON.stringify(config), { mode: 0o600 });
  const original = readFileSync(configPath, "utf8");
  if (!original.includes("[auth.sms.test_otp]\n")) throw new Error("Table OTP fictive manquante");
  const entries = config.pool.map(({ phone, code }) => `${phone} = "${code}"`);
  const missing = entries.filter((line) => !original.includes(`\n${line}\n`));
  if (missing.length) {
    writeFileSync(configPath, original.replace(
      "[auth.sms.test_otp]\n",
      `[auth.sms.test_otp]\n${missing.join("\n")}\n`,
    ), { mode: 0o600 });
  }
  saveAllowlist([...accounts, ...config.pool]);
  console.info(campaign ? "Campagne prête : 5 passagers et 10 chauffeurs invités." : "Réserve fictive prête.");
}

await db.connect();
try {
  if (adminPool || campaign) await seedPool();
  else await seedInitialAccounts();
} finally {
  await db.end();
}

async function seedInitialAccounts() {
  const ids = {};
  for (const account of accounts) ids[account.role] = await seedAccount(account);
  for (const account of accounts.filter(({ role }) => ["client", "driver"].includes(role))) {
    await db.query(
      "insert into public.alpha_invites(phone,role,invited_by) values($1,$2,$3) on conflict do nothing",
      [account.phone, account.role, ids.ops],
    );
  }
  await seedVehicle(ids.driver, "TEKO-TEST");
  const documents = await db.query("select id from public.driver_documents where driver_id=$1", [
    ids.driver,
  ]);
  if (!documents.rowCount) await seedDocuments(ids.driver, await signIn("driver"), await signIn("ops"));
  for (const [key, value] of [
    ["push_webhook_url", "http://supabase_kong_teko-alpha-remote:8000/functions/v1/notify-push"],
    ["push_webhook_secret", functions.PUSH_TRIGGER_SECRET],
  ]) {
    await db.query(
      "insert into public.app_config(key,value) values($1,$2::jsonb) on conflict(key) do update set value=excluded.value",
      [key, JSON.stringify(value)],
    );
  }
  writeFileSync(resolve(workdir, "anon-key"), `${status.ANON_KEY}\n`, { mode: 0o600 });
  const pool = existsSync(poolPath) ? JSON.parse(readFileSync(poolPath, "utf8")).pool : [];
  saveAllowlist([...accounts, ...pool]);
  console.info(
    "Comptes fictifs et invitations préparés ; codes disponibles dans le dossier privé.",
  );
}
