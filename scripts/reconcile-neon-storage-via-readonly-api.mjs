/** Source read-only metadata vs isolated Neon Object Storage inventory. No private bytes downloaded. */
import dotenv from "dotenv";
import { createHash } from "node:crypto";
import { S3Client, ListBucketsCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { sourceReadOnlyQuery, sourceProjectRef } from "./supabase-readonly-management-api.mjs";
import { listAllBucketObjects, compareStorageObjectInventory } from "./storage-reconciliation-utils.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
if (process.env.NEON_STAGING_BRANCH_ID !== "br-frosty-haze-azsnybmr") {
  throw new Error("Unexpected Neon storage branch.");
}
const endpoint = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";
const client = new S3Client({ endpoint, region: process.env.AWS_REGION || "ap-southeast-1",
  forcePathStyle: true, credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } });
const hashBytes = process.argv.includes("--hash-bytes");
const sourceUrl = process.env.SUPABASE_URL;
const sourceKey = process.env.SUPABASE_SECRET_KEY;
if (hashBytes && (sourceUrl !== `https://${sourceProjectRef}.supabase.co` || !sourceKey)) {
  throw new Error("Source storage read configuration is unavailable or targets another project.");
}
const hashBody = async body => {
  if (!body) throw new Error("Object response has no body.");
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of body) {
    const buffer = Buffer.from(chunk);
    hash.update(buffer);
    bytes += buffer.length;
  }
  return { sha256: hash.digest("hex"), bytes };
};
const pathFingerprint = name => createHash("sha256").update(name).digest("hex").slice(0, 16);

try {
  const sourceBuckets = await sourceReadOnlyQuery(`SELECT id,public FROM storage.buckets ORDER BY id`);
  const sourceObjects = await sourceReadOnlyQuery(`SELECT bucket_id,name,
    (metadata->>'size')::bigint AS size,metadata->>'mimetype' AS content_type
    FROM storage.objects ORDER BY bucket_id,name`);
  const buckets = (await client.send(new ListBucketsCommand({}))).Buckets?.map(row => row.Name) ?? [];
  const targetObjects = [];
  for (const bucket of buckets) targetObjects.push(...await listAllBucketObjects(client, bucket));
  const comparison = compareStorageObjectInventory(sourceObjects, targetObjects);
  const missingBucketIds = sourceBuckets.filter(row => !buckets.includes(row.id)).map(row => row.id);
  const stagingOnlyObjectFingerprints = targetObjects
    .filter(row => !sourceObjects.some(sourceRow => sourceRow.bucket_id === row.bucket && sourceRow.name === row.key))
    .map(row => ({ bucket: row.bucket,
      keyFingerprint: createHash("sha256").update(row.key).digest("hex").slice(0, 16) }));
  const source = new Map(sourceObjects.map(row => [JSON.stringify([row.bucket_id, row.name]), row]));
  const target = new Map(targetObjects.map(row => [JSON.stringify([row.bucket, row.key]), row]));
  let sizeMatches = 0;
  let contentTypeMatches = 0;
  let shared = 0;
  const byteChecks = [];
  for (const [identity, object] of source) {
    const counterpart = target.get(identity);
    if (!counterpart) continue;
    shared += 1;
    if (Number(object.size) === counterpart.size) sizeMatches += 1;
    const head = await client.send(new HeadObjectCommand({ Bucket: counterpart.bucket, Key: counterpart.key }));
    if (object.content_type === head.ContentType) contentTypeMatches += 1;
    if (hashBytes) {
      const sourcePath = `${encodeURIComponent(object.bucket_id)}/${object.name.split("/").map(encodeURIComponent).join("/")}`;
      const response = await fetch(`${sourceUrl}/storage/v1/object/authenticated/${sourcePath}`, {
        method: "GET", headers: { Authorization: `Bearer ${sourceKey}`, apikey: sourceKey },
        redirect: "error", cache: "no-store",
      });
      if (!response.ok) throw new Error(`Source storage GET failed for bucket ${object.bucket_id}: HTTP ${response.status}`);
      const sourceDigest = await hashBody(response.body);
      const targetBody = (await client.send(new GetObjectCommand({ Bucket: counterpart.bucket, Key: counterpart.key }))).Body;
      const targetDigest = await hashBody(targetBody);
      byteChecks.push({ bucket: object.bucket_id, pathFingerprint: pathFingerprint(object.name),
        sourceBytes: sourceDigest.bytes, targetBytes: targetDigest.bytes,
        sourceSha256: sourceDigest.sha256, targetSha256: targetDigest.sha256,
        match: sourceDigest.sha256 === targetDigest.sha256 && sourceDigest.bytes === targetDigest.bytes });
    }
  }
  console.log(JSON.stringify({ mode: "READ_ONLY_STORAGE_METADATA_RECONCILIATION",
    sourceProject: sourceProjectRef, targetBranch: process.env.NEON_STAGING_BRANCH_ID,
    sourceBuckets: sourceBuckets.length, targetBuckets: buckets.length,
    missingTargetBuckets: missingBucketIds.length, missingBucketIds,
    stagingOnlyObjectFingerprints,
    ...comparison, sharedObjects: shared, sizeMatches, contentTypeMatches,
    ...(hashBytes ? { byteChecks, matchingBytes: byteChecks.filter(row => row.match).length }
      : { limitation: "Metadata/listing is not an atomic storage snapshot or private-byte hash/access proof" }),
    consistency: "Source metadata and object GETs are not one atomic snapshot" }));
} catch (error) {
  console.error("Read-only storage reconciliation failed:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
}
