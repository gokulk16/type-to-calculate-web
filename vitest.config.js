import { defineConfig, coverageConfigDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    testTimeout: 10000,
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
      exclude: [
        "**/**/esbuild.js",
        "sw.js",
        "esbuild-helper/**",
        ...coverageConfigDefaults.exclude],
    },
  },
});
