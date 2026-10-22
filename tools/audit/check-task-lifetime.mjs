// Vérifie le contrat headless installé et injecte l'ancienne terminaison prématurée.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const root = resolve(import.meta.dirname, "../..");
const path = resolve(root, "node_modules/expo-task-manager/build/TaskManager.js");
const source = readFileSync(path, "utf8");
const hash = (value) => createHash("sha256").update(value).digest("hex");
// Évaluer seulement l'enregistrement réel : aucune API native ni code de tâche GPS.
const registration = source.match(/if \(Platform.OS === 'android'\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(registration, "Enregistrement Android absent de la dépendance installée");
async function lifecycle(code, platform = "android") {
  let provider;
  runInNewContext(code, {
    Platform: { OS: platform },
    AppRegistry: {
      registerHeadlessTask: (name, factory) => {
        assert.equal(name, "expo-task-manager");
        provider = factory;
      },
    },
  });
  if (!provider) return { registered: false, finished: false };
  let finished = false;
  // React Native notifie la fin native quand cette Promise se résout.
  provider()({}).then(() => {
    finished = true;
  });
  await new Promise(setImmediate);
  return { registered: true, finished };
}
assert.deepEqual(await lifecycle(registration), { registered: true, finished: false });
assert.deepEqual(await lifecycle(registration, "ios"), { registered: false, finished: false });
const mutant = registration.replace(
  /\(\) => \(\) => new Promise\(\(\) => \{\s*\}\)/,
  "() => async () => {}",
);
assert.notEqual(mutant, registration, "Faute injectée sans effet");
let detected = false;
try {
  assert.deepEqual(await lifecycle(mutant), { registered: true, finished: false });
} catch (error) {
  if (error.code !== "ERR_ASSERTION") throw error;
  detected = true;
}
assert.equal(detected, true, "La terminaison prématurée doit être détectée");
assert.equal(hash(readFileSync(path, "utf8")), hash(source), "Source installée modifiée");
const evidence = resolve(root, ".local/alpha-evidence/task-lifetime");
mkdirSync(evidence, { recursive: true });
const result = {
  patchedTaskRemainsPending: true,
  prematureCompletionDetected: detected,
  installedSourceUnchanged: true,
  installedSourceSha256: hash(source),
  scope: "Contrat JavaScript ; les essais Android physiques restent distincts",
};
writeFileSync(resolve(evidence, "results.json"), `${JSON.stringify(result, null, 2)}\n`);
console.info(JSON.stringify(result));
