// Validation des APK USB : identité, signature et absence des secrets du banc.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = process.argv[2];
if (!["client", "driver"].includes(app)) throw new Error("Application attendue : client ou driver");
const apk = resolve(
  import.meta.dirname,
  `../../apps/${app}/android/app/build/outputs/apk/release/app-release.apk`,
);
const sdk = "/home/steph/Android/Sdk/build-tools/36.0.0";
const env = { ...process.env, JAVA_HOME: "/home/steph/.local/jdk/jdk-17.0.20.1+1" };
const run = (command, args) =>
  execFileSync(command, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
const certificate = run(`${sdk}/apksigner`, ["verify", "--print-certs", apk]).toString();
const fingerprint = certificate
  .match(/certificate SHA-256 digest: ([a-f0-9]+)/i)?.[1]
  ?.toLowerCase();
if (fingerprint !== "82067811c3dfde8a89e174707cc2057891ee81e367bf88f417e6d78e83192998")
  throw new Error("Clé alpha inattendue");
const manifest = run(`${sdk}/aapt`, ["dump", "badging", apk]).toString();
if (
  !manifest.includes(`package: name='ga.teko.${app}.alpha'`) ||
  manifest.includes("application-debuggable")
)
  throw new Error("Identité ou mode release invalide");
for (const permission of [
  "android.permission.RECORD_AUDIO",
  "android.permission.SYSTEM_ALERT_WINDOW",
]) {
  if (manifest.includes(permission)) throw new Error(`Permission superflue : ${permission}`);
}
const entries = run("unzip", ["-Z1", apk])
  .toString()
  .split("\n")
  .filter((name) => name && !name.endsWith("/"));
const generated = resolve(import.meta.dirname, `../../apps/${app}/android/app/build`);
const bundle = run("unzip", ["-p", apk, "assets/index.android.bundle"]);
if (
  !bundle.equals(
    readFileSync(resolve(generated, "generated/assets/react/release/index.android.bundle")),
  )
)
  throw new Error("Le bundle APK diffère du dernier bundle construit");
const sourceMap = JSON.parse(
  readFileSync(
    resolve(generated, "intermediates/sourcemaps/react/release/index.android.bundle.packager.map"),
    "utf8",
  ),
);
const sourcesVerified =
  app === "driver"
    ? [
        "node_modules/expo-task-manager/build/TaskManager.js",
        "apps/driver/src/lib/location-task.ts",
        "apps/driver/src/features/work/use-push-positions.ts",
        "apps/driver/src/features/work/pin-panel.tsx",
        "apps/driver/src/features/work/use-ride-actions.ts",
        "apps/driver/app/(main)/ride/[id].tsx",
        "packages/api-client/src/session-identity.ts",
      ]
    : [
        "apps/client/src/features/booking/use-pickup-confirmation.ts",
        "apps/client/src/features/booking/use-estimates.ts",
        "apps/client/app/(main)/category.tsx",
        "apps/client/src/features/booking/quote-error-screen.tsx",
        "apps/client/src/features/booking/strings.ts",
        "packages/api-client/src/quotes.ts",
      ];
for (const path of sourcesVerified) {
  const index = sourceMap.sources.findIndex((source) => source.endsWith(`/${path}`));
  if (
    index < 0 ||
    sourceMap.sourcesContent?.[index] !==
      readFileSync(resolve(import.meta.dirname, "../..", path), "utf8")
  )
    throw new Error(`Source du correctif absente ou périmée dans le build : ${path}`);
}
const names = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "PUSH_TRIGGER_SECRET",
  "PURGE_TRIGGER_SECRET",
  "TEKO_SANDBOX_SECRET",
  "EXPO_ACCESS_TOKEN",
];
const properties = readFileSync(
  resolve(import.meta.dirname, "../../.local/alpha-signing/signing.properties"),
  "utf8",
);
const signing = Object.fromEntries(
  properties.split("\n").map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
const secrets = [
  ...names.map((name) => [name, process.env[name]]),
  ["storePassword", signing.storePassword],
  ["keyPassword", signing.keyPassword],
];
const fcmPath = resolve(
  import.meta.dirname,
  "../../.local/alpha-services/fcm-service-account.json",
);
if (existsSync(fcmPath)) {
  const key = JSON.parse(readFileSync(fcmPath, "utf8")).private_key;
  if (typeof key !== "string" || !key.includes("BEGIN PRIVATE KEY"))
    throw new Error("Clé FCM de contrôle invalide");
  secrets.push(["FCM_PRIVATE_KEY", key], ["FCM_PRIVATE_KEY_JSON", key.replaceAll("\n", "\\n")]);
}
for (const [name, value] of secrets) {
  if (!value) throw new Error(`Secret de contrôle manquant : ${name}`);
}
// Toutes les entrées, y compris XML et bibliothèques natives, une à la fois.
const encoded = secrets.map(([name, value]) => ({
  name,
  utf8: Buffer.from(value),
  utf16: Buffer.from(value, "utf16le"),
}));
for (const entry of entries) {
  const data = run("unzip", ["-p", apk, entry]);
  for (const secret of encoded) {
    if (data.includes(secret.utf8) || data.includes(secret.utf16))
      throw new Error(`Secret incorporé dans l’APK : ${secret.name}`);
  }
}
console.info(
  JSON.stringify({
    app,
    package: `ga.teko.${app}.alpha`,
    signed: true,
    fingerprint,
    sha256: createHash("sha256").update(readFileSync(apk)).digest("hex"),
    privateSecretsFound: false,
    entriesScanned: entries.length,
    sourcesVerified,
    scope: "APK USB local ; ne vaut pas validation du build terrain",
  }),
);
