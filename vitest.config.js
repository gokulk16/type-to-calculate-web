import { defineConfig, coverageConfigDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
    coverage: {
      enabled: true,
      reporter: [
        ["json-summary", { file: "coverage-summary.json" }],
        "json",
        "text",
      ],
      reportOnFailure: true,
      clean: true,
      exclude: ["**/**/esbuild.js", ...coverageConfigDefaults.exclude],
    },
  },
});
