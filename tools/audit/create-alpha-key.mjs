// Clé alpha dédiée, autorisée par le porteur ; aucun secret dans Git ou stdout.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const directory = resolve(root, ".local/alpha-signing");
const keystore = resolve(directory, "teko-alpha.p12");
const properties = resolve(directory, "signing.properties");
if (existsSync(keystore) || existsSync(properties)) {
  if (!existsSync(keystore) || !existsSync(properties))
    throw new Error("Configuration de signature incomplète : conserver les fichiers existants.");
  console.info("Clé alpha existante conservée.");
} else {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const password = randomBytes(32).toString("hex");
  const keytool = process.argv[2];
  if (!keytool) throw new Error("Fournir le chemin du keytool JDK 17.");
  execFileSync(
    keytool,
    [
      "-genkeypair",
      "-storetype",
      "PKCS12",
      "-keystore",
      keystore,
      "-alias",
      "teko-alpha",
      "-keyalg",
      "RSA",
      "-keysize",
      "3072",
      "-validity",
      "3650",
      "-dname",
      "CN=Teko Alpha",
      "-storepass:env",
      "TEKO_ALPHA_KEY_PASSWORD",
      "-keypass:env",
      "TEKO_ALPHA_KEY_PASSWORD",
      "-noprompt",
    ],
    {
      env: { ...process.env, TEKO_ALPHA_KEY_PASSWORD: password },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  chmodSync(keystore, 0o600);
  writeFileSync(
    properties,
    `storeFile=${keystore}\nstorePassword=${password}\nkeyAlias=teko-alpha\nkeyPassword=${password}\n`,
    { mode: 0o600 },
  );
  console.info("Clé alpha créée hors Git. Sauvegarde sécurisée à organiser avant distribution.");
}
