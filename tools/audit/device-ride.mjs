// Actions passager réelles par JWT, réservées aux fixtures du banc GPS USB.
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(
  resolve(import.meta.dirname, "../../supabase/tests/e2e/package.json"),
);
const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");
const [action, rideId] = process.argv.slice(2);
if (!["create", "pin", "status"].includes(action)) throw new Error("create, pin ou status requis");
if (
  process.env.SUPABASE_URL !== "http://127.0.0.1:58321" ||
  process.env.TEKO_E2E_DISPOSABLE !== "teko-alpha-audit" ||
  !process.env.DATABASE_URL?.includes(":58322/")
)
  throw new Error("Banc isolé requis");
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  const owner = await db.query(
    "select id from auth.users where phone='24107000001' and deleted_at is null",
  );
  if (owner.rowCount !== 1) throw new Error("Passager synthétique introuvable");
  if (action === "status") {
    const result = await db.query(
      "select id,status,price_est,price_final from public.rides where client_id=$1 order by created_at desc limit 1",
      [owner.rows[0].id],
    );
    console.info(JSON.stringify(result.rows[0] ?? null));
  } else {
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const session = await client.auth.verifyOtp({
      phone: "+24107000001",
      token: "123456",
      type: "sms",
    });
    if (session.error) throw session.error;
    if (action === "pin") {
      const own = await db.query("select id from public.rides where id=$1 and client_id=$2", [
        rideId,
        owner.rows[0].id,
      ]);
      if (own.rowCount !== 1) throw new Error("Course de fixture requise");
      const result = await client.rpc("ride_pin", { p_ride: rideId });
      if (result.error) throw result.error;
      console.info(
        JSON.stringify({ pin: result.data, scope: "Lecture par le JWT passager synthétique" }),
      );
    } else {
      const active = await db.query(
        "select id from public.rides where client_id=$1 and status in ('requested','accepted','enroute','arrived','started')",
        [owner.rows[0].id],
      );
      if (active.rowCount)
        throw new Error("Course déjà active : reprendre explicitement, ne pas dupliquer");
      const quote = await client.functions.invoke("price-quote", {
        body: {
          category: "eco",
          origin: { lon: 9.4544, lat: 0.4035 },
          destination: { lon: 9.4671, lat: 0.4148 },
        },
      });
      if (quote.error) throw quote.error;
      const created = await client.rpc("request_quoted_ride", {
        p_quote: quote.data.id,
        p_origin_hint: "Banc GPS USB · trajet synthétique",
        p_dest_hint: "Banc GPS USB",
      });
      if (created.error) throw created.error;
      console.info(
        JSON.stringify({
          id: created.data.id,
          status: created.data.status,
          price: Number(created.data.price_est),
          scope: "Banc GPS synthétique uniquement",
        }),
      );
    }
  }
} finally {
  await db.end();
}
