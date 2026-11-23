import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["./tests/setup.js"],
    // Shared file-backed store per test file; keep files sequential so setup
    // cleanup can never race another suite.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    restoreMocks: true,
  },
});
