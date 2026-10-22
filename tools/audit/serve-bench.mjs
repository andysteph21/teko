// Runtime local détaché du terminal, avec arrêt limité au processus enregistré.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(import.meta.dirname, "../../.local/alpha-evidence");
const statePath = resolve(directory, "functions-server.json");
const bench = "/tmp/teko-alpha-bench";
const envFile = "/tmp/teko-alpha-functions.env";
const action = process.argv[2];
if (!["start", "stop", "status"].includes(action)) throw new Error("start, stop ou status attendu");
if (
  !readFileSync(`${bench}/supabase/config.toml`, "utf8").includes('project_id = "teko-alpha-audit"')
)
  throw new Error("Banc isolé exigé");
const identity = (pid) => {
  try {
    const args = readFileSync(`/proc/${pid}/cmdline`).toString().split("\0");
    if (args.slice(1, 5).join(" ") !== `functions serve --workdir ${bench}`) return null;
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19];
  } catch {
    return null;
  }
};
const previous = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : null;
const running =
  typeof previous?.startTime === "string" && identity(previous.pid) === previous.startTime;
if (action === "status") console.info(JSON.stringify({ running: Boolean(running) }));
else if (action === "stop") {
  if (running) process.kill(previous.pid, "SIGTERM");
  console.info(JSON.stringify({ stopRequested: Boolean(running) }));
} else if (running) console.info("Runtime enregistré déjà actif.");
else {
  if (!existsSync(envFile)) throw new Error("Configuration du banc absente");
  // Un autre runtime doit être arrêté explicitement avant le démarrage.
  const response = await fetch("http://127.0.0.1:58321/functions/v1/notify-push", {
    method: "POST",
    signal: AbortSignal.timeout(3000),
  });
  if (response.status !== 503)
    throw new Error("Runtime existant ou banc non disponible ; démarrage refusé");
  mkdirSync(directory, { recursive: true });
  const log = openSync(resolve(directory, "functions-server.log"), "a", 0o600);
  const child = spawn(
    "supabase",
    ["functions", "serve", "--workdir", bench, "--env-file", envFile],
    {
      cwd: resolve(import.meta.dirname, "../.."),
      detached: true,
      stdio: ["ignore", log, log],
    },
  );
  try {
    await once(child, "spawn");
    const startTime = identity(child.pid);
    if (!startTime) throw new Error("Identité du runtime non confirmée");
    writeFileSync(statePath, JSON.stringify({ pid: child.pid, startTime }), { mode: 0o600 });
    child.unref();
    console.info("Runtime alpha lancé ; vérifier sa disponibilité avant les essais.");
  } catch (error) {
    child.kill("SIGTERM");
    throw error;
  } finally {
    closeSync(log);
  }
}
