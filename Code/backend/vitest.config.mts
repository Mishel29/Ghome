import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/integration/graphql.integration.test.ts"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts"],
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "coverage/backend",
      exclude: ["src/generated/**", "src/**/*.test.ts", "src/integration/**"],
    },
  },
});
