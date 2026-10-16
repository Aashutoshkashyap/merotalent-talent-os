/** Launch the local Next server against the explicitly approved isolated staging branch. */
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

const loaded = dotenv.config({ path: ".migration.env", quiet: true });
if (loaded.error) throw loaded.error;
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
if (process.env.MEROTALENT_BACKEND_MODE !== "neon-staging" || process.env.VERCEL_ENV === "production") {
  throw new Error("Refusing to start outside isolated local Neon staging mode.");
}

const child = spawn("npm", ["run", "dev", "--", "-p", "3210", "-H", "127.0.0.1"], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
