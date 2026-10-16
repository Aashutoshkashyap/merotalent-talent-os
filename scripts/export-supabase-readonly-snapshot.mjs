/** Source read-only export. Writes only an encrypted owner-readable local artifact. */
import { sourceReadOnlyQuery } from "./supabase-readonly-management-api.mjs";
import { buildSourceSnapshotQuery,
  summarizeSourceSnapshot, validateSourceSnapshot } from "./source-auth-snapshot.mjs";
import { persistEncryptedSourceSnapshot, sourceSnapshotKeychainService } from "./source-snapshot-artifact.mjs";

try {
  const tables = await sourceReadOnlyQuery(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
  const names = tables.map(row => row.table_name);
  const result = await sourceReadOnlyQuery(buildSourceSnapshotQuery(names, { includeSchema: process.argv.includes("--include-schema") }), { timeoutMs: 120000 });
  if (result.length !== 1) throw new Error("The source did not return exactly one snapshot.");
  const snapshot = validateSourceSnapshot(result[0].snapshot, names);
  const summary = summarizeSourceSnapshot(snapshot);
  const artifact = await persistEncryptedSourceSnapshot(snapshot);
  console.log(JSON.stringify({ mode: "READ_ONLY_SINGLE_STATEMENT_SOURCE_EXPORT", ...summary,
    encryptedArtifact: artifact, encryptedReadbackVerified: true,
    keyLocation: process.env.NEON_MIGRATION_SNAPSHOT_ENCRYPTION_KEY ? "environment" : `macOS Keychain: ${sourceSnapshotKeychainService}` }));
} catch (error) {
  // Do not print provider bodies, SQL row values, command arguments or connection strings.
  console.error("Source snapshot stopped:", error instanceof Error && error.message.startsWith("Supabase read-only query")
    ? error.message : error instanceof Error ? error.name : "UNKNOWN_ERROR");
  process.exitCode = 1;
}
