// Générateur de tokens — SOURCE D'AUTORITÉ : docs/design/design-tokens.json.
// Émet src/tokens.ts (objet typé, valeurs numériques pour RN) et
// src/tokens.css (variables CSS pour l'admin Tailwind). Déterministe :
// relancer via `pnpm gen:tokens` ; tout écart tokens/maquettes est un bug.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "..", "docs", "design", "design-tokens.json");
const design = JSON.parse(readFileSync(source, "utf8"));

/** Valeur TS : les nombres deviennent des nombres (RN est sans unité). */
function toTsValue(type, value) {
  if (type === "number") return Number(value);
  if (type === "dimension") return Number.parseFloat(value);
  if (type === "duration") return Number.parseInt(value, 10);
  return value;
}

function isToken(node) {
  return typeof node === "object" && node !== null && "$value" in node;
}

function buildTree(node) {
  if (isToken(node)) return toTsValue(node.$type, node.$value);
  const out = {};
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    out[key] = buildTree(child);
  }
  return out;
}

function collectCssVars(node, path, out) {
  if (isToken(node)) {
    const name = path.map((p) => p.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()).join("-");
    out.push([`--${name}`, String(node.$value)]);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    collectCssVars(child, [...path, key], out);
  }
}

const tree = buildTree(design);
const header = `// GÉNÉRÉ par scripts/generate-tokens.mjs depuis docs/design/design-tokens.json
// — NE PAS ÉDITER À LA MAIN. Régénérer : pnpm gen:tokens (package @teko/ui).
// Tout écart entre ces valeurs et les maquettes est un bug (convention projet).
`;

writeFileSync(
  join(here, "..", "src", "tokens.ts"),
  `${header}
export const tokens = ${JSON.stringify(tree, null, 2)} as const;

export const color = tokens.color;
export const typography = tokens.typography;
export const spacing = tokens.spacing;
export const borderRadius = tokens.borderRadius;
export const shadow = tokens.shadow;
export const animation = tokens.animation;
export const zIndex = tokens.zIndex;
export const breakpoint = tokens.breakpoint;

export type Tokens = typeof tokens;
`,
);

const cssVars = [];
collectCssVars(design, [], cssVars);
writeFileSync(
  join(here, "..", "src", "tokens.css"),
  `/* GÉNÉRÉ par scripts/generate-tokens.mjs — NE PAS ÉDITER (pnpm gen:tokens). */
:root {
${cssVars.map(([name, value]) => `  ${name}: ${value};`).join("\n")}
}
`,
);

console.log(`tokens.ts + tokens.css générés (${cssVars.length} tokens).`);
