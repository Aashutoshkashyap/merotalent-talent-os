/** Read-only provenance of unresolved résumé references; emits hashes and counts only. */
import dotenv from "dotenv";
import pg from "pg";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { sha256, storageReference } from "./recovery-integrity.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const branch = "br-frosty-haze-azsnybmr";
const endpoint = `https://${branch}.storage.c-3.ap-southeast-1.aws.neon.tech`;
if (process.env.AWS_ENDPOINT_URL_S3 !== endpoint) throw new Error("UNEXPECTED_STAGING_TARGET");
const source = await readEncryptedSourceSnapshot(process.argv[2]);
const sourceObjects = new Set(source.storage.objects.map(value => JSON.parse(value))
  .map(row => `${row.bucket_id}/${row.name}`));
const sourceTables = Object.fromEntries(["profiles", "job_applications"].map(table => [table,
  new Map(source.public[table].map(value => JSON.parse(value)).map(row => [row.id ?? row.user_id, row]))]));
const client = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 30000 });
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION, forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
let connected = false, transaction = false;
try {
  await client.connect(); connected = true;
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"); transaction = true;
  await client.query("SET LOCAL statement_timeout='30s'");
  const rows = (await client.query(`SELECT 'profiles' AS relation,id::text,user_id::text,resume_url AS value
    FROM public.profiles WHERE resume_url IS NOT NULL
    UNION ALL SELECT 'job_applications',id::text,user_id::text,resume_url
    FROM public.job_applications WHERE resume_url IS NOT NULL`)).rows;
  const missing = new Map();
  for (const row of rows) {
    const reference = storageReference(row.value, "resumes");
    if (!reference) continue;
    let exists = false;
    try { await s3.send(new HeadObjectCommand({ Bucket: reference.bucket, Key: reference.key })); exists = true; }
    catch (error) { if (error?.$metadata?.httpStatusCode !== 404) throw new Error("STORAGE_LOOKUP_FAILED"); }
    if (exists) continue;
    const key = `${reference.bucket}/${reference.key}`;
    const sourceRow = sourceTables[row.relation].get(row.id) ?? sourceTables[row.relation].get(row.user_id);
    const sourceReference = storageReference(sourceRow?.resume_url, "resumes");
    const sourceHasReference = sourceReference?.key === reference.key;
    const record = missing.get(key) ?? { referenceSha256: sha256(key), relations: {},
      applicantOwnerPrefix: reference.key.startsWith(`${row.user_id}/`),
      sourceReferencePresent: false, sourceStorageObjectPresent: sourceObjects.has(key), stagingOnlyRecord: false };
    record.relations[row.relation] = (record.relations[row.relation] ?? 0) + 1;
    record.sourceReferencePresent ||= sourceHasReference;
    record.stagingOnlyRecord ||= !sourceRow;
    missing.set(key, record);
  }
  console.log(JSON.stringify({ mode: "READ_ONLY_MISSING_RESUME_PROVENANCE", sourceWrites: 0, stagingWrites: 0,
    sourceSnapshotAt: source.statementTimestamp, unresolvedReferences: missing.size,
    sourceAlreadyMissing: [...missing.values()].filter(row => row.sourceReferencePresent && !row.sourceStorageObjectPresent).length,
    sourceObjectNotMigrated: [...missing.values()].filter(row => row.sourceStorageObjectPresent).length,
    stagingOnlyReferences: [...missing.values()].filter(row => !row.sourceReferencePresent).length,
    references: [...missing.values()].sort((a, b) => a.referenceSha256.localeCompare(b.referenceSha256)) }));
} catch {
  console.error(JSON.stringify({ result: "FAIL", code: "MISSING_MEDIA_CLASSIFICATION_FAILED" })); process.exitCode = 1;
} finally {
  if (transaction) await client.query("ROLLBACK").catch(() => undefined);
  if (connected) await client.end().catch(() => undefined);
  s3.destroy();
}
