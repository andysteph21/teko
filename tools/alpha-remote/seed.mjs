// Initialise uniquement les quatre comptes fictifs de l'essai distant.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
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

async function seedDocuments(driver) {
  const client = await signIn("driver");
  const ops = await signIn("ops");
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
    const path = `${driver}/${type}-${randomUUID()}.png`;
    const upload = await client.storage
      .from("kyc")
      .upload(path, image, { contentType: "image/png" });
    if (upload.error) throw upload.error;
    const document = await client
      .from("driver_documents")
      .insert({ driver_id: driver, type, storage_path: path })
      .select("id")
      .single();
    if (document.error) throw document.error;
    const review = await ops
      .from("driver_documents")
      .update({ status: "validated", note: "Fictif" })
      .eq("id", document.data.id);
    if (review.error) throw review.error;
  }
  const physical = await ops.rpc("record_physical_verification", {
    p_driver: driver,
    p_note: "Donnée fictive de l’essai distant",
  });
  if (physical.error) throw physical.error;
  const validation = await ops.rpc("validate_kyc", {
    p_driver: driver,
    p_accept: true,
    p_note: "Donnée fictive de l’essai distant",
  });
  if (validation.error) throw validation.error;
}

await db.connect();
try {
  const ids = {};
  for (const account of accounts) ids[account.role] = await seedAccount(account);
  for (const account of accounts.filter(({ role }) => ["client", "driver"].includes(role))) {
    await db.query(
      "insert into public.alpha_invites(phone,role,invited_by) values($1,$2,$3) on conflict do nothing",
      [account.phone, account.role, ids.ops],
    );
  }
  await db.query(
    "insert into public.drivers(id,categories,gps_consent) values($1,'{eco}',false) on conflict do nothing",
    [ids.driver],
  );
  await db.query(
    "insert into public.vehicles(driver_id,category,plate) values($1,'eco','TEKO-TEST') on conflict do nothing",
    [ids.driver],
  );
  const documents = await db.query("select id from public.driver_documents where driver_id=$1", [
    ids.driver,
  ]);
  if (!documents.rowCount) await seedDocuments(ids.driver);
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
  const phones = Object.fromEntries(
    accounts
      .filter(({ role }) => ["client", "driver"].includes(role))
      .map(({ phone, role }) => [phone, role]),
  );
  writeFileSync(resolve(workdir, "phones.json"), `${JSON.stringify(phones)}\n`, { mode: 0o600 });
  console.info(
    "Comptes fictifs et invitations préparés ; codes disponibles dans le dossier privé.",
  );
} finally {
  await db.end();
}
