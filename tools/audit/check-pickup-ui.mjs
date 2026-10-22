// Une copie fautive du hook est chargée uniquement par Jest, jamais par Metro.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const app = resolve(root, "apps/client");
const sourcePath = resolve(app, "src/features/booking/use-pickup-confirmation.ts");
const source = readFileSync(sourcePath, "utf8");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const evidence = resolve(root, ".local/alpha-evidence/pickup-ui-mutation");
mkdirSync(evidence, { recursive: true, mode: 0o700 });
const copy = resolve(evidence, "use-pickup-confirmation.ts");
let mutated = source.replace(
  "onSuccess: setPending,",
  "onSuccess: (confirmed) => { setPending(confirmed); request(confirmed); },",
);
assert.notEqual(mutated, source, "La faute doit modifier le hook");
for (const relative of ["../../lib/supabase", "./store", "./use-request-ride"]) {
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
  moduleNameMapper: { "use-pickup-confirmation$": copy },
};
const mode = process.argv[2];
if (mode === "prepare") {
  writeFileSync(copy, mutated, { mode: 0o600 });
  writeFileSync(resolve(evidence, "jest.config.json"), JSON.stringify(config), { mode: 0o600 });
  writeFileSync(resolve(evidence, "source.sha256"), hash(source), { mode: 0o600 });
  rmSync(resolve(evidence, "jest-result.json"), { force: true });
  console.info("Copie fautive préparée ; lancer Jest avec sa configuration isolée, puis vérifier.");
} else if (mode === "verify") {
  try {
    const results = JSON.parse(readFileSync(resolve(evidence, "jest-result.json"), "utf8"));
    const output = results.testResults
      .flatMap((suite) => suite.assertionResults.flatMap((test) => test.failureMessages))
      .join("\n");
    writeFileSync(resolve(evidence, "automatic-order.log"), output, { mode: 0o600 });
    // Un import cassé, un timeout ou une panne d'outil ne vaut pas détection.
    const detected =
      results.numFailedTests === 1 &&
      results.numRuntimeErrorTestSuites === 0 &&
      output.includes("not.toHaveBeenCalled()") &&
      output.includes("Expected number of calls: 0") &&
      output.includes("Received number of calls: 1");
    assert.equal(
      hash(source),
      readFileSync(resolve(evidence, "source.sha256"), "utf8"),
      "Source applicative inchangée",
    );
    writeFileSync(
      resolve(evidence, "result.json"),
      JSON.stringify(
        {
          mutation: "commande-avant-confirmation-du-prix",
          detected,
          sourceUnchanged: true,
          sourceSha256: hash(source),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    assert.equal(
      detected,
      true,
      "La commande automatique doit faire échouer l'assertion d'absence de commande",
    );
    console.info("Commande avant confirmation du prix : DÉTECTÉE ; source applicative inchangée.");
  } finally {
    rmSync(copy, { force: true });
  }
} else throw new Error("Mode attendu : prepare ou verify");
