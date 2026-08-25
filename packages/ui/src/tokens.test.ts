// Test anti-dérive : les tokens générés doivent refléter EXACTEMENT
// docs/design/design-tokens.json (source d'autorité). Si ce test casse,
// relancer `pnpm gen:tokens` — ne jamais éditer tokens.ts à la main.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { color, spacing, tokens, typography, zIndex } from "./tokens.js";

const here = dirname(fileURLToPath(import.meta.url));
const design = JSON.parse(
  readFileSync(join(here, "..", "..", "..", "docs", "design", "design-tokens.json"), "utf8"),
) as Record<string, unknown>;

interface DesignToken {
  $type?: string;
  $value: string;
}

function collect(node: unknown, path: string[], out: [string, DesignToken][]): void {
  if (typeof node !== "object" || node === null) return;
  if ("$value" in node) {
    out.push([path.join("."), node as DesignToken]);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    collect(child, [...path, key], out);
  }
}

function lookup(path: string): unknown {
  let node: unknown = tokens;
  for (const part of path.split(".")) {
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function expected(token: DesignToken): unknown {
  if (token.$type === "number") return Number(token.$value);
  if (token.$type === "dimension") return Number.parseFloat(token.$value);
  if (token.$type === "duration") return Number.parseInt(token.$value, 10);
  return token.$value;
}

describe("tokens générés vs design-tokens.json", () => {
  const all: [string, DesignToken][] = [];
  collect(design, [], all);

  it("le fichier source contient bien des tokens", () => {
    expect(all.length).toBeGreaterThan(100);
  });

  it("chaque token du fichier source existe dans tokens.ts avec la bonne valeur", () => {
    for (const [path, token] of all) {
      expect(lookup(path), path).toStrictEqual(expected(token));
    }
  });

  it("valeurs pivots verrouillées (doc 10 / maquettes)", () => {
    expect(color.brand[800]).toBe("#5A1A80");
    expect(color.brand[500]).toBe("#8C238A");
    expect(color.role.driver.accent).toBe("#00BFA5");
    expect(color.map.markerLandmark).toBe("#F5A623");
    expect(spacing[12]).toBe(48);
    expect(typography.fontSize["3xl"]).toBe(34);
    expect(zIndex.widget).toBe(300);
  });
});
