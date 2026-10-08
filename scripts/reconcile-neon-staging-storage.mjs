/** Read-only Supabase production vs Neon migration-staging object hash check. */
import crypto from "node:crypto";
import fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand, HeadObjectCommand, ListBucketsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

dotenv.config({ path: ".migration.env", quiet: true });
const sourceUrl = new URL(process.env.SUPABASE_DATABASE_URL || "postgresql://invalid@invalid");
const endpoint = process.env.AWS_ENDPOINT_URL_S3;
if (sourceUrl.hostname !== "db.dtirpilgzlsfryucanlg.supabase.co" ||
    endpoint !== "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech") {
  throw new Error("Source or storage endpoint is not the approved branch.");
}
const source = new pg.Client({ connectionString: sourceUrl.toString(), options: "-c default_transaction_read_only=on" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION || "ap-southeast-1", forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
try {
  await source.connect();
  const [buckets, objects] = await Promise.all([
    source.query("SELECT id, public FROM storage.buckets ORDER BY id"),
    source.query(`SELECT bucket_id,name,(metadata->>'size')::bigint AS size,
      metadata->>'mimetype' AS content_type FROM storage.objects ORDER BY bucket_id,name`),
  ]);
  const targetBuckets = (await s3.send(new ListBucketsCommand({}))).Buckets?.map(b => b.Name) ?? [];
  const checks = [];
  for (const object of objects.rows) {
    const sourceDownload = await supabase.storage.from(object.bucket_id).download(object.name);
    let sourceBytes;
    if (sourceDownload.data && !sourceDownload.error) {
      sourceBytes = Buffer.from(await sourceDownload.data.arrayBuffer());
    } else {
      const authUrl = `${process.env.SUPABASE_URL}/storage/v1/object/authenticated/${encodeURIComponent(object.bucket_id)}/${object.name.split('/').map(encodeURIComponent).join('/')}`;
      const response = await fetch(authUrl, { headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        apikey: process.env.SUPABASE_SECRET_KEY,
      } });
      if (!response.ok) throw new Error(`Source download failed for ${object.bucket_id} (SDK ${sourceDownload.error?.statusCode || 'unknown'}, REST HTTP ${response.status}).`);
      sourceBytes = Buffer.from(await response.arrayBuffer());
    }
    const targetDownload = await s3.send(new GetObjectCommand({ Bucket: object.bucket_id, Key: object.name }));
    const targetBytes = Buffer.from(await targetDownload.Body.transformToByteArray());
    const sourceSha256 = crypto.createHash("sha256").update(sourceBytes).digest("hex");
    const targetSha256 = crypto.createHash("sha256").update(targetBytes).digest("hex");
    const head = await s3.send(new HeadObjectCommand({ Bucket: object.bucket_id, Key: object.name }));
    checks.push({ bucket: object.bucket_id,
      sourceBytes: sourceBytes.length, targetBytes: targetBytes.length,
      sourceSha256, targetSha256,
      sourceContentType: object.content_type, targetContentType: head.ContentType,
      byteAndHashMatch: sourceBytes.length === targetBytes.length && sourceSha256 === targetSha256,
      contentTypeMatch: object.content_type === head.ContentType });
  }
  let targetObjectCount = 0, targetTotalBytes = 0;
  for (const bucket of targetBuckets) {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
    targetObjectCount += list.Contents?.length ?? 0;
    targetTotalBytes += list.Contents?.reduce((n, object) => n + (object.Size || 0), 0) ?? 0;
  }
  const report = {
    at: new Date().toISOString(), sourceHost: sourceUrl.hostname, stageEndpoint: endpoint,
    sourceBuckets: buckets.rows, targetBuckets,
    sourceObjects: objects.rows.length, targetObjects: targetObjectCount,
    sourceBytes: checks.reduce((n,o) => n+o.sourceBytes,0), targetBytes:targetTotalBytes,
    matchingObjects: checks.filter(c => c.byteAndHashMatch).length,
    matchingContentTypes: checks.filter(c => c.contentTypeMatch).length,
    objects: checks,
  };
  fs.writeFileSync("docs/neon-isolated-staging-storage-reconciliation-2026-10-08.json", JSON.stringify(report,null,2), { mode: 0o600 });
  console.log(JSON.stringify({sourceBuckets:report.sourceBuckets.length,targetBuckets:report.targetBuckets.length,
    missingBuckets:report.sourceBuckets.map(b=>b.id).filter(id=>!targetBuckets.includes(id)),
    sourceObjects:report.sourceObjects,targetObjects:report.targetObjects,
    sourceBytes:report.sourceBytes,targetBytes:report.targetBytes,
    matchingObjects:report.matchingObjects,matchingContentTypes:report.matchingContentTypes},null,2));
} finally { await source.end().catch(()=>{}); }
