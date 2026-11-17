// Prépare une base neuve pour les essais privés. Ne copie aucune donnée du banc USB.
import { randomBytes, randomInt } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const workdir = resolve(root, ".local/alpha-remote");
const project = "teko-alpha-remote";
const api = "http://127.0.0.1:58421";

const source = resolve(root, "supabase");
const target = resolve(workdir, "supabase");
const nonce = () => randomBytes(32).toString("hex");
const roles = ["client", "driver", "ops", "finance"];
const reservedCodes = new Set(["123456"]);
function newCode() {
  let code;
  do code = String(randomInt(100000, 1000000));
  while (reservedCodes.has(code));
  reservedCodes.add(code);
  return code;
}
const accounts = roles.map((role, index) => ({
  role,
  phone: `24100000900${index + 1}`,
  code: newCode(),
}));
const config = `[api]
port = 58421

[db]
port = 58422
shadow_port = 58420
major_version = 17

[studio]
enabled = false

[inbucket]
enabled = false

[analytics]
enabled = false

[auth]
enabled = true
enable_signup = false
site_url = "${api}"
jwt_secret = "${nonce()}"
publishable_key = "sb_publishable_${nonce()}"
secret_key = "sb_secret_${nonce()}"

[auth.sms]
enable_signup = true
enable_confirmations = true

[auth.sms.twilio]
enabled = true
account_sid = "AC00000000000000000000000000000000"
message_service_sid = "MG00000000000000000000000000000000"
auth_token = "disabled"

[auth.sms.test_otp]
${accounts.map(({ phone, code }) => `${phone} = "${code}"`).join("\n")}

[functions.notify-push]
verify_jwt = false
`;

mkdirSync(target, { recursive: true, mode: 0o700 });
writeFileSync(resolve(target, "config.toml"), `project_id = "${project}"\n\n${config}`, {
  flag: "wx",
  mode: 0o600,
});
writeFileSync(resolve(workdir, "accounts.json"), `${JSON.stringify(accounts, null, 2)}\n`, {
  flag: "wx",
  mode: 0o600,
});
for (const name of ["migrations", "functions", "seed.sql"]) {
  cpSync(resolve(source, name), resolve(target, name), { recursive: true });
}
const expo = readFileSync(
  resolve(root, ".local/alpha-services/expo-push-token.txt"),
  "utf8",
).trim();
if (!/^[A-Za-z0-9_-]{32,}$/.test(expo)) throw new Error("Jeton serveur Expo invalide");
writeFileSync(
  resolve(workdir, "functions.env"),
  [
    "VALHALLA_URL=http://host.docker.internal:8002",
    "PUSH_PROVIDER=expo",
    `EXPO_ACCESS_TOKEN=${expo}`,
    `PUSH_TRIGGER_SECRET=${nonce()}`,
    "TEKO_PAYMENT_SANDBOX=false",
    "",
  ].join("\n"),
  { flag: "wx", mode: 0o600 },
);
console.info("Configuration privée prête : teko-alpha-remote, aucun SMS ni paiement réel.");
