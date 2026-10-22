// La reconnexion doit échouer dans une copie isolée qui réactive les requêtes.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const app = resolve(root, "apps/client");
const sourcePath = resolve(app, "src/features/booking/use-estimates.ts");
const source = readFileSync(sourcePath, "utf8");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const evidence = resolve(root, ".local/alpha-evidence/estimates-ui-mutation");
mkdirSync(evidence, { recursive: true, mode: 0o700 });
const copy = resolve(evidence, "use-estimates.ts");
let mutated = source.replace("refetchOnReconnect: false,", "refetchOnReconnect: true,");
assert.notEqual(mutated, source);
for (const relative of ["../../lib/supabase", "./store"]) {
  mutated = mutated.replace(
    JSON.stringify(relative),
    JSON.stringify(resolve(dirname(sourcePath), relative)),
  );
}
const require = createRequire(import.meta.url);
const config = {
  ...require(resolve(app, "jest.config.js")),
  rootDir: app,
  modulePaths: [resolve(app, "node_modules"), resolve(root, "node_modules")],
  moduleNameMapper: { "use-estimates$": copy },
};
writeFileSync(copy, mutated, { mode: 0o600 });
const resultPath = resolve(evidence, "jest-result.json");
rmSync(resultPath, { force: true });
try {
  const run = spawnSync(
    "pnpm",
    [
      "exec",
      "jest",
      "--runInBand",
      "--config",
      JSON.stringify(config),
      "--json",
      "--outputFile",
      resultPath,
      "use-estimates.test.tsx",
    ],
    { cwd: app, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 60000 },
  );
  writeFileSync(resolve(evidence, "run.log"), `${run.stdout ?? ""}\n${run.stderr ?? ""}`, {
    mode: 0o600,
  });
  if (run.error) throw run.error;
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  const failures = result.testResults.flatMap((suite) =>
    suite.assertionResults.filter((test) => test.status === "failed"),
  );
  const output = failures.flatMap((test) => test.failureMessages).join("\n");
  const detected =
    run.status === 1 &&
    result.numRuntimeErrorTestSuites === 0 &&
    failures.length === 1 &&
    failures[0].title.includes("reconnexion") &&
    output.includes("Expected number of calls: 3") &&
    output.includes("Received number of calls: 6");
  const sourceUnchanged = digest(source) === digest(readFileSync(sourcePath, "utf8"));
  writeFileSync(
    resolve(evidence, "result.json"),
    JSON.stringify({ mutation: "relance-devis-reconnexion", detected, sourceUnchanged }),
    { mode: 0o600 },
  );
  assert.equal(sourceUnchanged, true);
  assert.equal(
    detected,
    true,
    "La relance automatique doit être détectée par le compte des requêtes",
  );
  console.info("Relance des devis à la reconnexion : DÉTECTÉE ; source inchangée.");
} finally {
  rmSync(copy, { force: true });
}
