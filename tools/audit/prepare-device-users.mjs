// Comptes de démonstration exclusivement sur le banc USB. Aucun SMS réel.

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(
  resolve(import.meta.dirname, "../../supabase/tests/e2e/package.json"),
);
const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");
if (
  process.env.SUPABASE_URL !== "http://127.0.0.1:58321" ||
  process.env.TEKO_E2E_DISPOSABLE !== "teko-alpha-audit"
)
  throw new Error("Banc USB exigé");
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const sql = new Client({ connectionString: process.env.DATABASE_URL });
await sql.connect();
async function user(phone, role, name, adminRole) {
  const existing = await sql.query(
    "select id from auth.users where phone=$1 and deleted_at is null",
    [phone],
  );
  let id = existing.rows[0]?.id;
  if (!id) {
    const result = await admin.auth.admin.createUser({ phone, phone_confirm: true });
    if (result.error) throw result.error;
    id = result.data.user.id;
  }
  await sql.query("begin");
  await sql.query("set local teko.service='on'");
  await sql.query("update public.profiles set role=$2, full_name=$3, admin_role=$4 where id=$1", [
    id,
    role,
    name,
    adminRole ?? null,
  ]);
  await sql.query("commit");
  return id;
}
async function session(phone) {
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const result = await client.auth.verifyOtp({ phone: `+${phone}`, token: "123456", type: "sms" });
  if (result.error) throw result.error;
  return client;
}
try {
  await user("24107000001", "client", "Passager banc USB");
  const driver = await user("24107000002", "driver", "Chauffeur banc USB");
  const ops = await user("24107000005", "admin", "Ops banc USB", "ops");
  await user("24107000007", "admin", "Finance banc USB", "finance");
  for (const [phone, role] of [
    ["24107000001", "client"],
    ["24107000002", "driver"],
  ]) {
    await sql.query(
      "insert into public.alpha_invites(phone,role,invited_by) values($1,$2,$3) on conflict(phone,role) do update set is_active=true",
      [phone, role, ops],
    );
  }
  await sql.query(
    "insert into public.drivers(id,categories,gps_consent) values($1,'{eco}',true) on conflict(id) do nothing",
    [driver],
  );
  // Véhicule de fixture créé par le service ; le parcours KYC ci-dessous emploie de vrais JWT.
  await sql.query(
    "insert into public.vehicles(driver_id,category,plate) values($1,'eco','BANC-USB') on conflict(driver_id,category) do nothing",
    [driver],
  );
  const driverClient = await session("24107000002");
  const opsClient = await session("24107000005");
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
    const upload = await driverClient.storage
      .from("kyc")
      .upload(path, image, { contentType: "image/png" });
    if (upload.error) throw upload.error;
    const added = await driverClient
      .from("driver_documents")
      .insert({ driver_id: driver, type, storage_path: path })
      .select()
      .single();
    if (added.error) throw added.error;
    const reviewed = await opsClient
      .from("driver_documents")
      .update({ status: "validated", note: "Fixture USB, ne vaut pas vérification terrain" })
      .eq("id", added.data.id);
    if (reviewed.error) throw reviewed.error;
  }
  const physical = await opsClient.rpc("record_physical_verification", {
    p_driver: driver,
    p_note: "Fixture USB uniquement : vérification physique terrain encore obligatoire",
  });
  if (physical.error) throw physical.error;
  const validated = await opsClient.rpc("validate_kyc", {
    p_driver: driver,
    p_accept: true,
    p_note: "Fixture USB uniquement",
  });
  if (validated.error) throw validated.error;
  console.info(
    "Comptes USB prêts : passager …0001, chauffeur …0002, Ops …0005, Finance …0007. OTP local 123456. Aucun SMS envoyé.",
  );
} finally {
  await sql.end();
}
