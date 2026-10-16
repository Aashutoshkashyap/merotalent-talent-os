/** Conservative, staging-only draft cleanup. Dry-run unless --apply is explicit. */
import pg from "pg";
import dotenv from "dotenv";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { isConservativeDraftCandidate } from "./job-draft-cleanup-policy.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const dbUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(dbUrl);
const endpoint = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";
if (process.env.AWS_ENDPOINT_URL_S3 !== endpoint) throw new Error("Unexpected staging object-storage endpoint.");
const apply = process.argv.includes("--apply");
const pathOptions = process.argv.filter(arg => arg.startsWith("--path="));
if (pathOptions.length > 1 || process.argv.some(arg => arg.startsWith("--")
  && arg !== "--apply" && !arg.startsWith("--path="))) throw new Error("Unsupported cleanup option.");
const exactPath = pathOptions[0]?.slice("--path=".length) || null;
if (pathOptions.length && !exactPath) throw new Error("An exact object path is required.");
const db = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 10000 });
const s3 = apply ? new S3Client({ endpoint, region: process.env.AWS_REGION || "ap-southeast-1",
  forcePathStyle: true, credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } }) : null;
let scanned = 0, deleted = 0, protectedCount = 0;
try {
  await db.connect();
  // Only keys explicitly registered by this application's upload route are
  // candidates. Never infer an orphan from an S3 listing or a filename.
  const candidates = (await db.query(`SELECT path FROM public.neon_job_document_drafts
    WHERE state='draft' AND uploaded_at < now() - interval '72 hours'
      AND ($1::text IS NULL OR path=$1)
    ORDER BY uploaded_at LIMIT 100`, [exactPath])).rows;
  scanned = candidates.length;
  if (apply) {
    for (const { path } of candidates) {
      await db.query("BEGIN");
      try {
        const row = (await db.query(`SELECT path, user_id, job_id, state, application_id, uploaded_at
          FROM public.neon_job_document_drafts
          WHERE path=$1 AND state='draft' AND uploaded_at < now() - interval '72 hours'
          FOR UPDATE`, [path])).rows[0];
        if (!row) { await db.query("ROLLBACK"); protectedCount++; continue; }
        if (!isConservativeDraftCandidate(row)) { await db.query("ROLLBACK"); protectedCount++; continue; }
        const references = await db.query(`SELECT id FROM public.job_applications
          WHERE form_data->>'experienceLetterUrl'=$1 OR form_data->>'trainingDocumentUrl'=$1
          LIMIT 1`, [row.path]);
        if (references.rows[0]) { await db.query("ROLLBACK"); protectedCount++; continue; }
        await s3.send(new DeleteObjectCommand({ Bucket: "job-files", Key: row.path }));
        await db.query(`UPDATE public.neon_job_document_drafts
          SET state='deleted', deleted_at=now() WHERE path=$1 AND state='draft'`, [row.path]);
        await db.query("COMMIT");
        deleted++;
      } catch (error) {
        await db.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    }
  }
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", graceHours: 72,
    exactPathFilter: !!exactPath,
    candidateCount: scanned, deletedCount: deleted, protectedCount, batchLimit: 100 }));
} catch (error) {
  console.error(`Staging draft cleanup failed (${typeof error?.code === "string" ? error.code : "UNKNOWN"}).`);
  process.exitCode = 1;
} finally {
  await db.end().catch(() => undefined);
  s3?.destroy();
}
