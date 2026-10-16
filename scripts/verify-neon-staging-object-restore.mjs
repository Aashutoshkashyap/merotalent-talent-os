/** Isolated Neon staging object backup/restore rehearsal; never touches production. */
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import { S3Client, ListBucketsCommand, GetObjectCommand, PutObjectCommand,
  CreateBucketCommand, DeleteBucketCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { listAllBucketObjects } from "./storage-reconciliation-utils.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
if (process.env.NEON_STAGING_BRANCH_ID !== "br-frosty-haze-azsnybmr") throw new Error("Unexpected staging branch.");
const endpoint = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";
if (process.env.AWS_ENDPOINT_URL_S3 !== endpoint) throw new Error("Unexpected staging storage endpoint.");
if (!process.argv.includes("--apply-staging")) {
  console.log(JSON.stringify({ mode: "DRY_RUN", branch: process.env.NEON_STAGING_BRANCH_ID,
    next: "Use --apply-staging to create an isolated temporary restore bucket." }));
  process.exit(0);
}
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION || "ap-southeast-1", forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
const bucket = `mt-restore-probe-${randomUUID().slice(0, 12)}`;
const scratch = mkdtempSync(join(tmpdir(), "merotalent-object-restore-"));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
let created = false;
const restoredKeys = [];
let success = false;

try {
  const sourceBuckets = (await s3.send(new ListBucketsCommand({}))).Buckets?.map(row => row.Name) ?? [];
  const snapshots = [];
  for (const sourceBucket of sourceBuckets.filter(name => name !== bucket)) {
    for (const object of await listAllBucketObjects(s3, sourceBucket)) {
      const response = await s3.send(new GetObjectCommand({ Bucket: sourceBucket, Key: object.key }));
      const bytes = Buffer.from(await response.Body.transformToByteArray());
      const localFile = join(scratch, String(snapshots.length));
      writeFileSync(localFile, bytes, { mode: 0o600 });
      snapshots.push({ sourceBucket, key: object.key, localFile, bytes: bytes.length,
        sha256: digest(bytes), contentType: response.ContentType || "application/octet-stream" });
    }
  }
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  created = true;
  for (const object of snapshots) {
    const restoreKey = `${object.sourceBucket}/${object.key}`;
    const bytes = readFileSync(object.localFile);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: restoreKey,
      Body: bytes, ContentType: object.contentType, ContentLength: bytes.length }));
    restoredKeys.push(restoreKey);
    const [head, read] = await Promise.all([
      s3.send(new HeadObjectCommand({ Bucket: bucket, Key: restoreKey })),
      s3.send(new GetObjectCommand({ Bucket: bucket, Key: restoreKey })),
    ]);
    const restored = Buffer.from(await read.Body.transformToByteArray());
    if (head.ContentLength !== object.bytes || head.ContentType !== object.contentType ||
        restored.length !== object.bytes || digest(restored) !== object.sha256) {
      throw new Error("Restored object failed byte, hash, or content-type verification.");
    }
  }
  success = true;
  console.log(JSON.stringify({ result: "PASS", branch: process.env.NEON_STAGING_BRANCH_ID,
    sourceBuckets: sourceBuckets.length, restoredObjects: snapshots.length,
    restoredBytes: snapshots.reduce((sum, row) => sum + row.bytes, 0),
    target: "isolated temporary bucket on staging Object Storage",
    limitation: "Same storage service; private application authorization and cross-environment disaster recovery are separate." }));
} catch (error) {
  console.error("Isolated object restore failed:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  if (created) {
    for (const key of restoredKeys.reverse()) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => { process.exitCode = 1; });
    }
    await s3.send(new DeleteBucketCommand({ Bucket: bucket })).catch(() => {
      console.error("Temporary restore bucket cleanup needs review."); process.exitCode = 1;
    });
  }
  rmSync(scratch, { recursive: true, force: true });
  s3.destroy();
  if (success && process.exitCode !== 1) console.log(JSON.stringify({ cleanup: "PASS", temporaryBucketRemoved: true }));
}
