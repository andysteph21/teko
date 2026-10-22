// Exerce le parseur réellement résolu par Expo Router, sous délai maximal.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Worker } from "node:worker_threads";

const require = createRequire(import.meta.url);
const routerRequire = createRequire(require.resolve("expo-router/package.json"));
const queryPath = routerRequire.resolve("query-string");
const queryRequire = createRequire(queryPath);
assert.equal(
  JSON.parse(
    readFileSync(
      join(dirname(queryRequire.resolve("decode-uri-component")), "package.json"),
      "utf8",
    ),
  ).version,
  "0.5.0",
);
const script = `
 const assert=require('node:assert/strict');
 const query=require(${JSON.stringify(queryPath)});
 const valid=query.parse('name=March%C3%A9%20du%20Mont-Bou%C3%ABt&ride=123&tag=a&tag=b');
 assert.equal(valid.name,'Marché du Mont-Bouët');
 assert.equal(valid.ride,'123');
 assert.deepEqual(valid.tag,['a','b']);
 for(const payload of ['%FF'.repeat(100000),'%E0%A4'.repeat(50000),'%'.repeat(300000),'%C3%A9'.repeat(100000)]){
   const parsed=query.parse('q='+payload);
   assert.equal(typeof parsed.q,'string');
 }
`;
const worker = new Worker(script, { eval: true, resourceLimits: { maxOldGenerationSizeMb: 128 } });
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    void worker.terminate();
    reject(new Error("Le parseur doit terminer en moins de 5 secondes"));
  }, 5000);
  worker.once("error", (error) => {
    clearTimeout(timeout);
    reject(error);
  });
  worker.once("exit", (code) => {
    clearTimeout(timeout);
    if (code === 0) resolve();
    else reject(new Error(`Le contrôle du parseur a échoué (${code})`));
  });
});
console.info(
  "Expo Router : paramètres français/tableaux conservés, quatre liens malformés volumineux bornés à 5 s.",
);
