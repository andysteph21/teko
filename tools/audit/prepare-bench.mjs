// Prépare uniquement le projet Supabase jetable de l'audit alpha.
// Aucune commande reset/start n'est exécutée et aucune clé n'est affichée.

import { randomBytes } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const source = resolve(root, "supabase");
const target = "/tmp/teko-alpha-bench/supabase";
// Retire uniquement les anciennes copies des tests du banc jetable.
rmSync(`${target}/tests`, { recursive: true, force: true });
mkdirSync(`${target}/tests`, { recursive: true });
for (const name of ["migrations", "functions", "tests/database"]) {
  cpSync(`${source}/${name}`, `${target}/${name}`, { recursive: true });
}
cpSync(`${source}/seed.sql`, `${target}/seed.sql`);
const secretsPath = "/tmp/teko-alpha-functions.env";
const persistedSecretsPath = resolve(root, ".local/alpha-services/bench-functions.env");
mkdirSync(resolve(root, ".local/alpha-services"), { recursive: true, mode: 0o700 });
if (!existsSync(secretsPath) && existsSync(persistedSecretsPath)) {
  cpSync(persistedSecretsPath, secretsPath);
}
if (!existsSync(secretsPath)) {
  const secret = () => randomBytes(32).toString("hex");
  writeFileSync(
    secretsPath,
    [
      `PUSH_TRIGGER_SECRET=${secret()}`,
      `PURGE_TRIGGER_SECRET=${secret()}`,
      "PAYMENT_PROVIDER=mock",
      "PUSH_PROVIDER=mock",
      "TEKO_PUSH_SANDBOX=true",
      "TEKO_PAYMENT_SANDBOX=true",
      `TEKO_SANDBOX_SECRET=${secret()}`,
      "VALHALLA_URL=http://host.docker.internal:8002",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
}
if (!readFileSync(secretsPath, "utf8").includes("TEKO_PUSH_SANDBOX=")) {
  writeFileSync(secretsPath, `${readFileSync(secretsPath, "utf8")}\nTEKO_PUSH_SANDBOX=true\n`, {
    mode: 0o600,
  });
}
const expoSecretPath = resolve(root, ".local/alpha-services/expo-push-token.txt");
if (
  existsSync(expoSecretPath) &&
  !readFileSync(secretsPath, "utf8").includes("EXPO_ACCESS_TOKEN=")
) {
  const token = readFileSync(expoSecretPath, "utf8").trim();
  if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) throw new Error("Jeton serveur Expo invalide");
  writeFileSync(
    secretsPath,
    `${readFileSync(secretsPath, "utf8").trimEnd()}\nEXPO_ACCESS_TOKEN=${token}\n`,
    { mode: 0o600 },
  );
}
const config = readFileSync(`${source}/config.toml`, "utf8")
  .replace('project_id = "teko"', 'project_id = "teko-alpha-audit"')
  .replace("[db]\n", "[db]\nport = 58322\nshadow_port = 58320\n");
writeFileSync(
  `${target}/config.toml`,
  `${config}\n[api]\nport = 58321\n\n[studio]\nenabled = false\n\n[inbucket]\nport = 58324\n\n[analytics]\nenabled = false\n`,
);
cpSync(secretsPath, persistedSecretsPath);
chmodSync(secretsPath, 0o600);
chmodSync(persistedSecretsPath, 0o600);
console.info("Banc alpha préparé : /tmp/teko-alpha-bench (API 58321, DB 58322).");
