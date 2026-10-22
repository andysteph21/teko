// Active le webhook exclusivement dans la base jetable, sans afficher son secret.
import { readFileSync } from "node:fs";
import pg from "../../supabase/tests/e2e/node_modules/pg/lib/index.js";

if (
  process.env.TEKO_E2E_DISPOSABLE !== "teko-alpha-audit" ||
  !process.env.SUPABASE_DB_URL?.includes(":58322/")
)
  throw new Error("Banc isolé requis");
const env = Object.fromEntries(
  readFileSync("/tmp/teko-alpha-functions.env", "utf8")
    .trim()
    .split("\n")
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
if (!env.PUSH_TRIGGER_SECRET) throw new Error("Secret webhook requis");
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await db.connect();
try {
  await db.query("begin");
  await db.query("set local teko.service='on'");
  for (const [key, value] of [
    ["push_webhook_url", "http://supabase_kong_teko-alpha-audit:8000/functions/v1/notify-push"],
    ["push_webhook_secret", env.PUSH_TRIGGER_SECRET],
  ]) {
    await db.query(
      "insert into public.app_config(key,value) values($1,$2::jsonb) on conflict(key) do update set value=excluded.value",
      [key, JSON.stringify(value)],
    );
  }
  await db.query("commit");
  console.info("Webhook Expo branché sur le seul banc alpha ; secret non affiché.");
} finally {
  await db.end();
}
