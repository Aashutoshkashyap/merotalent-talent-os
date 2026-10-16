import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [],
    fileParallelism: false,
    testTimeout: 30_000,
    include: ["src/test/neon-*-staging.test.ts", "src/test/neon-modules-e2e.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
