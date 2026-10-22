// Sépare les validations simulées et les essais Expo des seuls téléphones USB.
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const mode = process.argv[2];
if (mode !== "mock" && mode !== "expo") throw new Error("Mode requis : mock ou expo");
if (
  !readFileSync("/tmp/teko-alpha-bench/supabase/config.toml", "utf8").includes(
    'project_id = "teko-alpha-audit"',
  )
)
  throw new Error("Banc alpha requis");
const path = "/tmp/teko-alpha-functions.env";
const settings = Object.fromEntries(
  readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
if (mode === "expo" && !settings.EXPO_ACCESS_TOKEN) throw new Error("Jeton serveur Expo requis");
settings.PUSH_PROVIDER = mode;
settings.TEKO_PUSH_SANDBOX = String(mode === "mock");
const content = `${Object.entries(settings)
  .map(([key, value]) => `${key}=${value}`)
  .join("\n")}\n`;
for (const target of [
  path,
  resolve(import.meta.dirname, "../../.local/alpha-services/bench-functions.env"),
]) {
  writeFileSync(target, content, { mode: 0o600 });
  chmodSync(target, 0o600);
}
console.info(`Push du seul banc alpha : ${mode}. Secrets conservés hors Git, sans affichage.`);
