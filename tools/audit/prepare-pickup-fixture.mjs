// Repère synthétique du banc : permet de tester un déplacement de prise en charge.
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(
  resolve(import.meta.dirname, "../../supabase/tests/e2e/package.json"),
);
const { Client } = require("pg");
if (
  process.env.SUPABASE_URL !== "http://127.0.0.1:58321" ||
  process.env.TEKO_E2E_DISPOSABLE !== "teko-alpha-audit" ||
  !process.env.DATABASE_URL?.includes(":58322/")
)
  throw new Error("Banc USB isolé exigé");
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  const id = "72ff867e-a2fe-441d-9ead-9624f5bd8a31";
  await db.query(
    `insert into public.landmarks(id,name,geom,source,status)
    values($1,'Point de rencontre · banc USB',extensions.st_setsrid(extensions.st_makepoint(9.4544,0.4035),4326),'admin','validated')
    on conflict(id) do update set name=excluded.name,geom=excluded.geom,status=excluded.status`,
    [id],
  );
  console.info(JSON.stringify({ id, scope: "Repère synthétique local ; aucun relevé terrain" }));
} finally {
  await db.end();
}
