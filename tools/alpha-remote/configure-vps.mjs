// Configure Martin sur la seule base fictive distante, avec un mot de passe distinct.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const local = resolve(root, ".local/alpha-remote");
const db = "supabase_db_teko-alpha-remote";
const config = readFileSync(resolve(local, "supabase/config.toml"), "utf8");
if (!config.startsWith('project_id = "teko-alpha-remote"\n')) throw new Error("Banc fictif requis");
const bindings = execFileSync("docker", ["port", db, "5432"], { encoding: "utf8" }).trim();
if (bindings !== "127.0.0.1:58422") throw new Error("Postgres doit rester en boucle locale");
const password = randomBytes(32).toString("hex");
const template = readFileSync(resolve(root, "infra/tiles/martin/setup-martin-role.sql"), "utf8");
const sql = `begin;\n${template.replaceAll("martin_tiles_dev", password)}\nalter role martin_tiles password '${password}';\ncommit;\n`;
execFileSync(
  "docker",
  ["exec", "-i", db, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
  {
    input: sql,
    stdio: ["pipe", "ignore", "pipe"],
  },
);
writeFileSync(
  resolve(local, "martin.env"),
  `DATABASE_URL=postgresql://martin_tiles:${password}@${db}:5432/postgres\n`,
  { mode: 0o600 },
);
mkdirSync(resolve(local, "apks"), { recursive: true, mode: 0o700 });
console.info("Rôle Martin configuré sur la seule base fictive distante.");
