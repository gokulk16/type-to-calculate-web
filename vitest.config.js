import { defineConfig } from "vitest/config";
export default defineConfig({
  coverage: {
    enabled: true,
    reporter: [
      ["json-summary", { file: "coverage-summary.json" }],
      "json",
      "json-summary-compare-path",
      "text",
    ],
    reportOnFailure: true,
  },
  test: {
    environment: "jsdom",
    reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
  },
});
