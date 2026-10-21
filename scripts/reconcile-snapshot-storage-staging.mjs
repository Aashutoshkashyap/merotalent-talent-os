/** Read-only by default. Explicit staging cache repair preserves verified bytes using conditional PUT; never DELETE. */
import dotenv from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { S3Client,ListBucketsCommand,GetObjectCommand,PutObjectCommand } from "@aws-sdk/client-s3";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { sha256 } from "./recovery-integrity.mjs";
import { snapshotFingerprint } from "./source-snapshot-reconciliation.mjs";
import { listAllBucketObjects } from "./storage-reconciliation-utils.mjs";
import { compareObjectProof,snapshotStorageReferences } from "./snapshot-storage-checks.mjs";
let s3;
let metadataWrites=0;
try {
  const args={};
  for(const arg of process.argv.slice(2)) {
    const m=/^--(snapshot|snapshot-sha256|manifest|manifest-sha256|report|mode|target)=(.+)$/.exec(arg);
    if(!m || args[m[1]])throw new Error("INVALID_ARGUMENT");args[m[1]]=m[2];
  }
  if(!isAbsolute(args.report??"") || !/^[a-f0-9]{64}$/.test(args["manifest-sha256"]??""))throw new Error("RESTRICTED_REPORT_AND_MANIFEST_HASH_REQUIRED");
  dotenv.config({path:".migration.env",quiet:true});
  const branch="br-frosty-haze-azsnybmr",endpoint=`https://${branch}.storage.c-3.ap-southeast-1.aws.neon.tech`;
  if(process.env.VERCEL_ENV==="production"||process.env.NEON_STAGING_BRANCH_ID!==branch||process.env.AWS_ENDPOINT_URL_S3!==endpoint)throw new Error("UNVERIFIED_STAGING_STORAGE");
  const mode=args.mode??"verify";
  if(!["verify","repair-cache"].includes(mode))throw new Error("UNKNOWN_MODE");
  if(mode==="repair-cache"&&(args.target!==branch||process.env.NEON_STAGING_STORAGE_METADATA_REPAIR!==branch))throw new Error("STAGING_METADATA_REPAIR_NOT_ENABLED");
  const snapshot=await readEncryptedSourceSnapshot(args.snapshot);
  if(summarizeSourceSnapshot(snapshot).snapshotSha256!==args["snapshot-sha256"])throw new Error("SNAPSHOT_HASH_MISMATCH");
  const manifestBytes=await readFile(args.manifest);
  if(sha256(manifestBytes)!==args["manifest-sha256"])throw new Error("MANIFEST_HASH_MISMATCH");
  const manifest=JSON.parse(manifestBytes);
  if(manifest.sourceProject!==snapshot.sourceProject||manifest.targetBranch!==branch)throw new Error("MANIFEST_PROJECT_MISMATCH");
  const base=`https://${snapshot.sourceProject}.supabase.co`,secret=process.env.SUPABASE_SECRET_KEY;
  if(process.env.SUPABASE_URL!==base||!secret)throw new Error("SOURCE_STORAGE_READ_CREDENTIAL_UNAVAILABLE");
  s3=new S3Client({endpoint,region:process.env.AWS_REGION||"ap-southeast-1",forcePathStyle:true,credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
  const buckets=(await s3.send(new ListBucketsCommand({}))).Buckets?.map(b=>b.Name)??[];
  const inventory=[];for(const bucket of buckets)inventory.push(...await listAllBucketObjects(s3,bucket));
  const objects=snapshot.storage.objects.map(JSON.parse),sourceBuckets=snapshot.storage.buckets.map(JSON.parse);
  const checks=[],repairs=[];
  for(const object of objects) {
    const key=snapshotFingerprint(object.name);
    const matches=manifest.objects.filter(m=>m.bucket===object.bucket_id&&m.pathFingerprint===key);
    if(matches.length!==1)throw new Error("MANIFEST_OBJECT_MISSING_OR_AMBIGUOUS");
    const expected=matches[0],targetExists=inventory.some(o=>o.bucket===object.bucket_id&&o.key===object.name);
    const path=`${encodeURIComponent(object.bucket_id)}/${object.name.split("/").map(encodeURIComponent).join("/")}`;
    const response=await fetch(`${base}/storage/v1/object/authenticated/${path}`,{headers:{Authorization:`Bearer ${secret}`,apikey:secret},redirect:"error",signal:AbortSignal.timeout(30000)});
    const bytes=response.ok?Buffer.from(await response.arrayBuffer()):null;
    let targetBytes=null,targetType=null,targetCacheControl,targetObject;
    if(targetExists) {
      const result=await s3.send(new GetObjectCommand({Bucket:object.bucket_id,Key:object.name}));
      targetObject=result;
      targetBytes=Buffer.from(await result.Body.transformToByteArray());targetType=result.ContentType;targetCacheControl=result.CacheControl;
    }
    checks.push({bucket:object.bucket_id,pathFingerprint:key,sourcePublic:sourceBuckets.find(b=>b.id===object.bucket_id)?.public===true,
      sourceStatus:response.status,targetExists,sourceSha256:bytes?sha256(bytes):null,targetSha256:targetBytes?sha256(targetBytes):null,
      sourceBytes:bytes?.length??null,targetBytes:targetBytes?.length??null,
      ...compareObjectProof({expected,source:bytes?{sha256:sha256(bytes),bytes:bytes.length}:null,target:targetBytes?{sha256:sha256(targetBytes),bytes:targetBytes.length}:null,
        expectedType:object.metadata?.mimetype,targetType,expectedCacheControl:object.metadata?.cacheControl,targetCacheControl}),
      sourceMetadataFingerprint:sha256(JSON.stringify(object.metadata??{})),
      sourceSizeMetadataMatch:[object.metadata?.size,object.metadata?.contentLength].filter(v=>v!==undefined).every(v=>Number(v)===expected.sourceBytes)});
    if(mode==="repair-cache"&&!checks.at(-1).cacheControlMatch) {
      const proof=checks.at(-1);
      if(!proof.sourceManifestMatch||!proof.targetManifestMatch||!proof.contentTypeMatch||!proof.sourceSizeMetadataMatch||
        !targetObject?.ETag||typeof object.metadata?.cacheControl!=="string"||!object.metadata.cacheControl)throw new Error("UNSAFE_METADATA_REPAIR");
      repairs.push({object,targetObject,targetBytes,proof,expected});
    }
  }
  if(manifest.objects.length!==objects.length)throw new Error("MANIFEST_OBJECT_COVERAGE_CHANGED");
  // Complete all source/target checks before any writes; each same-key replacement is conditional on its observed ETag.
  if(mode==="repair-cache"&&checks.some(c=>!c.sourceManifestMatch||!c.targetManifestMatch||!c.contentTypeMatch||!c.sourceSizeMetadataMatch))throw new Error("OBJECT_PARITY_REQUIRED_BEFORE_METADATA_REPAIR");
  for(const {object,targetObject,targetBytes,proof,expected} of repairs) {
    await s3.send(new PutObjectCommand({Bucket:object.bucket_id,Key:object.name,Body:targetBytes,IfMatch:targetObject.ETag,
      ContentType:targetObject.ContentType,CacheControl:object.metadata.cacheControl,Metadata:targetObject.Metadata,
      ContentDisposition:targetObject.ContentDisposition,ContentEncoding:targetObject.ContentEncoding,ContentLanguage:targetObject.ContentLanguage,Expires:targetObject.Expires}));
    metadataWrites++;
    const reread=await s3.send(new GetObjectCommand({Bucket:object.bucket_id,Key:object.name}));
    const bytes=Buffer.from(await reread.Body.transformToByteArray());
    if(sha256(bytes)!==expected.sourceSha256||bytes.length!==expected.sourceBytes||reread.ContentType!==targetObject.ContentType||reread.CacheControl!==object.metadata.cacheControl||
      JSON.stringify(Object.entries(reread.Metadata??{}).sort())!==JSON.stringify(Object.entries(targetObject.Metadata??{}).sort()))throw new Error("METADATA_REPAIR_READBACK_FAILED");
    proof.cacheControlMatch=true;proof.cacheControlRepaired=true;
  }
  const references=snapshotStorageReferences(snapshot).map(({key,bucket,...ref})=>({...ref,bucket,presentInTarget:inventory.some(o=>o.bucket===bucket&&o.key===key)}));
  const unexpected=inventory.filter(t=>!objects.some(s=>s.bucket_id===t.bucket&&s.name===t.key)).map(t=>({bucket:t.bucket,pathFingerprint:snapshotFingerprint(t.key)}));
  const summary={sourceObjects:objects.length,verifiedBytes:checks.filter(c=>c.sourceManifestMatch&&c.targetManifestMatch).length,
    verifiedContentTypes:checks.filter(c=>c.contentTypeMatch).length,missingTarget:checks.filter(c=>!c.targetExists).length,
    verifiedCacheControls:checks.filter(c=>c.cacheControlMatch).length,
    verifiedSourceSizeMetadata:checks.filter(c=>c.sourceSizeMetadataMatch).length,
    unexpectedTarget:unexpected.length,missingSourceReferences:references.filter(r=>!r.presentInSource).length,
    missingTargetReferences:references.filter(r=>!r.presentInTarget).length};
  const report={mode,at:new Date().toISOString(),snapshotSha256:args["snapshot-sha256"],manifestSha256:args["manifest-sha256"],
    summary,objects:checks,unexpectedTarget:unexpected,references,missingBuckets:sourceBuckets.filter(b=>!buckets.includes(b.id)).map(b=>b.id),
    accessControlVerification:"SEPARATE_AUTHENTICATED_HTTP_UAT_REQUIRED",sourceWrites:0,stagingMetadataWrites:metadataWrites,consistency:"Historical source snapshot plus current GETs; final write-freeze manifest required",
    providerSpecificMetadata:"Source eTag, lastModified and httpStatusCode retained by source snapshot fingerprint; not expected to equal S3 provider-generated values"};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:"wx"});
  console.log(JSON.stringify({summary,report:args.report,sourceWrites:0,stagingMetadataWrites:metadataWrites}));
  if(summary.verifiedBytes!==objects.length||summary.verifiedContentTypes!==objects.length||summary.verifiedCacheControls!==objects.length||summary.verifiedSourceSizeMetadata!==objects.length)process.exitCode=2;
} catch(error) {
  console.error(JSON.stringify({result:"FAIL",code:/^[A-Z_]+$/.test(error?.message??"")?error.message:"STORAGE_RECONCILIATION_FAILED",stagingMetadataWrites:metadataWrites,retry:"RECONCILE_BEFORE_RETRY"}));process.exitCode=1;
} finally {s3?.destroy();}
