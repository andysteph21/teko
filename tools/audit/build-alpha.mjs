// APK release local, signature dédiée et identifiant distinct ; aucun secret affiché.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const app = process.argv[2];
if (!["client", "driver"].includes(app)) throw new Error("Application attendue : client ou driver");
const root = resolve(import.meta.dirname, "../..");
// Un seul build natif à la fois. flock libère le verrou même après un crash
// ou redémarrage : aucun PID périmé à supprimer manuellement.
if (!process.argv.includes("--locked")) {
  mkdirSync(resolve(root, ".local"), { recursive: true });
  const result = spawnSync(
    "flock",
    [
      "--exclusive",
      "--nonblock",
      "--conflict-exit-code",
      "75",
      resolve(root, ".local/alpha-build.lock"),
      process.execPath,
      import.meta.filename,
      ...process.argv.slice(2),
      "--locked",
    ],
    { cwd: root, env: process.env, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status === 75) console.error("Un build alpha est déjà actif ; attendre sa fin.");
  process.exit(result.status ?? 1);
}
const directory = resolve(root, "apps", app);
const firebaseConfig = resolve(root, ".local/alpha-services", `${app}-google-services.json`);
const env = {
  ...process.env,
  ...(existsSync(firebaseConfig) ? { TEKO_GOOGLE_SERVICES_FILE: firebaseConfig } : {}),
  TEKO_APP_VARIANT: "alpha",
  TEKO_ALLOW_LOCAL_HTTP: "1",
  EXPO_PUBLIC_ALPHA_USB_GPS: "1",
  JAVA_HOME: "/home/steph/.local/jdk/jdk-17.0.20.1+1",
  ANDROID_HOME: "/home/steph/Android/Sdk",
  NODE_ENV: "production",
};
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Compilation interrompue par ${result.signal}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const bundleOnly = process.argv.includes("--js-only");
const assembleOnly = process.argv.includes("--assemble-only");
const onlyBundle = process.argv.includes("--bundle-only");
if (onlyBundle && (!bundleOnly || assembleOnly))
  throw new Error("--bundle-only exige --js-only et exclut --assemble-only");
if (
  assembleOnly &&
  (!bundleOnly ||
    !existsSync(
      resolve(directory, "android/app/build/generated/assets/react/release/index.android.bundle"),
    ))
)
  throw new Error("Reprise d’assemblage : projet alpha et bundle déjà construit requis");
if (bundleOnly) {
  const gradle = readFileSync(resolve(directory, "android/app/build.gradle"), "utf8");
  if (
    !gradle.includes(`applicationId 'ga.teko.${app}.alpha'`) &&
    !gradle.includes(`applicationId "ga.teko.${app}.alpha"`)
  ) {
    throw new Error("Projet natif alpha attendu avant reconstruction JavaScript");
  }
} else {
  run("pnpm", ["exec", "expo", "prebuild", "--platform", "android", "--no-install"], directory);
}
writeFileSync(resolve(directory, "android/local.properties"), "sdk.dir=/home/steph/Android/Sdk\n");
const gradleOptions = [
  `-Dorg.gradle.java.home=${env.JAVA_HOME}`,
  "-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g",
  "-PreactNativeArchitectures=arm64-v8a",
  "--max-workers=2",
  "--no-daemon",
  "--console=plain",
];
if (bundleOnly && !assembleOnly) {
  // Metro exclut node_modules des entrées Gradle : une mise à jour transitive
  // doit reconstruire le bundle, même si aucun fichier applicatif ne change.
  run(
    "./gradlew",
    [":app:createBundleReleaseJsAndAssets", "--rerun", ...gradleOptions],
    resolve(directory, "android"),
  );
}
if (!onlyBundle)
  run("./gradlew", [":app:assembleRelease", ...gradleOptions], resolve(directory, "android"));
console.info(
  onlyBundle
    ? "Bundle alpha reconstruit ; APK restant à assembler."
    : `APK alpha local : ${directory}/android/app/build/outputs/apk/release/app-release.apk`,
);
