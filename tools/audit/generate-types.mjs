// Remplacement atomique : Metro/tsc ne doivent jamais lire un fichier tronqué.
import { execFileSync } from "node:child_process";
import { renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(import.meta.dirname, "../../packages/types/src/database.ts");
const result = execFileSync(
  "supabase",
  ["gen", "types", "typescript", "--local", "--workdir", "/tmp/teko-alpha-bench"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024,
  },
);
if (!result.includes("export type Database") || !result.includes("export type Json"))
  throw new Error("Types incomplets");
const normalized = result
  .split("\n")
  .map((line) => line.trimEnd())
  .join("\n");
writeFileSync(`${target}.tmp`, normalized);
renameSync(`${target}.tmp`, target);
console.info("Contrat TypeScript du banc alpha régénéré atomiquement.");
