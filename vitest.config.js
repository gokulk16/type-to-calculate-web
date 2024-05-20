import { defineConfig } from "vitest/config";
export default defineConfig({
  coverage: {
    enabled: true,
  },
  test: {
    environment: "jsdom",
  },
});
