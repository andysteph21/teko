import { defineConfig } from "vitest/config";

// Palier de couverture du doc 10 §6 : 95 % en gate CI sur les packages.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      thresholds: { lines: 95, functions: 95, statements: 95, branches: 90 },
    },
  },
});
