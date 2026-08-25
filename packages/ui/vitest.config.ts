import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/**/*.test.ts", "src/index.ts", "src/native/**"],
      thresholds: { lines: 95, functions: 95, statements: 95, branches: 90 },
    },
  },
});
