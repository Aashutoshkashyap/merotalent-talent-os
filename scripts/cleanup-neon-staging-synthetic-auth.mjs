/** Delete only unlinked, auth-only synthetic UAT users on isolated Neon staging. */
import pg from "pg";
import dotenv from "dotenv";
import { execFileSync } from "node:child_process";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const projectId = "summer-sky-63693897";
const branchId = "br-frosty-haze-azsnybmr";
const databaseUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(databaseUrl);
if (process.env.NEON_STAGING_BRANCH_ID !== branchId) {
  throw new Error("Refusing cleanup: staging branch ID is not the verified migration branch.");
}
const apply = process.argv.includes("--apply-staging");
if (process.argv.some(arg => arg.startsWith("--") && arg !== "--apply-staging")) {
  throw new Error("Only --apply-staging is supported; default mode is read-only.");
}
const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10000 });
const candidatesSql = `SELECT u.id,u.email FROM neon_auth."user" u
  WHERE lower(u.email) LIKE 'neon-%@example.com'
    AND NOT EXISTS (SELECT 1 FROM public.neon_identity_links l WHERE l.neon_auth_user_id=u.id)
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.email)=lower(u.email))
  ORDER BY u.id`;

try {
  await client.connect();
  const candidates = (await client.query(candidatesSql)).rows.filter(row =>
    /^neon-[a-z0-9._+-]+@example\.com$/i.test(row.email));
  const before = (await client.query(`SELECT count(*)::int AS count FROM neon_auth."user"`)).rows[0].count;
  if (!apply) {
    console.log(JSON.stringify({ mode: "DRY_RUN", branchId, managedAuthUsersBefore: before,
      unlinkedSyntheticCandidates: candidates.length, deleted: 0 }));
  } else {
    let deleted = 0;
    for (const candidate of candidates) {
      const eligible = (await client.query(`${candidatesSql.replace("ORDER BY u.id", "AND u.id=$1::uuid")}`,
        [candidate.id])).rows;
      if (eligible.length !== 1) throw new Error("Candidate changed during cleanup; stopping.");
      execFileSync("npx", ["--yes", "neon@latest", "neon-auth", "user", "delete", candidate.id,
        "--project-id", projectId, "--branch", branchId], { stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000 });
      const remains = (await client.query(`SELECT 1 FROM neon_auth."user" WHERE id=$1::uuid`,
        [candidate.id])).rowCount;
      if (remains !== 0) throw new Error("Managed Auth deletion was not reflected in the staging database.");
      deleted += 1;
    }
    const after = (await client.query(`SELECT count(*)::int AS count FROM neon_auth."user"`)).rows[0].count;
    console.log(JSON.stringify({ mode: "APPLY_STAGING", branchId, managedAuthUsersBefore: before,
      unlinkedSyntheticCandidates: candidates.length, deleted, managedAuthUsersAfter: after }));
  }
} catch (error) {
  console.error("Staging synthetic Auth cleanup stopped:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
