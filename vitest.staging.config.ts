import { defineConfig } from "vitest/config";
import path from "node:path";

/** Explicit opt-in: never connects to staging during the normal unit suite. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/neon-staging.integration.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
