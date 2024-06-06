import { defineConfig } from "vitest/config";
export default defineConfig({
  coverage: {
    enabled: true,
    reporter: ["text", "json-summary", "json", "json-summary-compare-path"],
    reportOnFailure: true,
  },
  test: {
    environment: "jsdom",
  },
});
