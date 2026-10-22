// Exécute les tests avec les seules clés de la stack alpha locale isolée.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const bench = "/tmp/teko-alpha-bench";
const root = resolve(import.meta.dirname, "../..");
const status = execFileSync("supabase", ["status", "--workdir", bench, "-o", "env"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const local = Object.fromEntries(
  status.split("\n").flatMap((line) => {
    const match = /^([A-Z_]+)="(.*)"$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  }),
);
const testSecrets = Object.fromEntries(
  readFileSync("/tmp/teko-alpha-functions.env", "utf8")
    .trim()
    .split("\n")
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
if (local.API_URL !== "http://127.0.0.1:58321" || !local.DB_URL?.includes(":58322/")) {
  throw new Error("Banc alpha isolé introuvable : refus d’exécuter les tests.");
}
const env = {
  ...process.env,
  ...local,
  ...testSecrets,
  SUPABASE_URL: local.API_URL,
  SUPABASE_ANON_KEY: local.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
  SUPABASE_DB_URL: local.DB_URL,
  DATABASE_URL: local.DB_URL,
  EXPO_PUBLIC_SUPABASE_URL: local.API_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
  TEKO_FUNCTIONS_URL: `${local.API_URL}/functions/v1`,
  TEKO_E2E_DISPOSABLE: "teko-alpha-audit",
};
const [command = process.execPath, ...args] = process.argv.slice(2);
const result = spawnSync(
  command,
  args.length
    ? args
    : [
        "node_modules/vitest/vitest.mjs",
        "run",
        "--pool=forks",
        "--maxWorkers=1",
        "--no-file-parallelism",
      ],
  {
    cwd: resolve(root, "supabase/tests/e2e"),
    env,
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
