/** Exercise a real private staging URL before and after expiration. */
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const endpoint = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";
if (process.env.AWS_ENDPOINT_URL_S3 !== endpoint) throw new Error("Unexpected staging storage endpoint.");
const bucket = "job-files";
const key = `staging-signed-url-expiry/${randomUUID()}.txt`;
const marker = `expiry-probe-${randomUUID()}`;
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION || "ap-southeast-1",
  forcePathStyle: true, credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } });
let created = false;
try {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key,
    Body: marker, ContentType: "text/plain", ContentLength: Buffer.byteLength(marker) }));
  created = true;
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 60 });
  const before = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!before.ok || await before.text() !== marker) throw new Error("Pre-expiry signed read failed.");
  await new Promise(resolve => setTimeout(resolve, 68000));
  const after = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (after.ok) throw new Error("Expired signed URL still returned success.");
  console.log(JSON.stringify({ result: "PASS", beforeStatus: before.status,
    afterStatus: after.status, expiresInSeconds: 60, observedAfterSeconds: 68 }));
} catch (error) {
  console.error(`Signed URL expiry verification failed (${typeof error?.code === "string" ? error.code : "PROBE_FAILED"}).`);
  process.exitCode = 1;
} finally {
  if (created) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    .catch(() => { console.error("Synthetic expiry object cleanup needs manual review."); process.exitCode = 1; });
  s3.destroy();
}
