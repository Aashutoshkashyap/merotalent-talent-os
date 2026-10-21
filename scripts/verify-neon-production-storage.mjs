/** Actual source and production S3 bytes, read-only. Never creates/replaces/deletes objects. */
import dotenv from "dotenv";
import { execFileSync } from "node:child_process";
import { readFile,writeFile } from "node:fs/promises";
import { S3Client,ListBucketsCommand,GetObjectCommand } from "@aws-sdk/client-s3";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { sha256 } from "./recovery-integrity.mjs";
import { snapshotFingerprint } from "./source-snapshot-reconciliation.mjs";
import { listAllBucketObjects } from "./storage-reconciliation-utils.mjs";
import { compareObjectProof,snapshotStorageReferences } from "./snapshot-storage-checks.mjs";
let s3;
try{
  const args=Object.fromEntries(process.argv.slice(2).map(v=>{const m=/^--(snapshot|snapshot-sha256|manifest|manifest-sha256|report)=(.+)$/.exec(v);if(!m)throw new Error('INVALID_ARGUMENT');return[m[1],m[2]];}));
  if(!args.report?.startsWith('/'))throw new Error('PRIVATE_REPORT_REQUIRED');
  const source=await readEncryptedSourceSnapshot(args.snapshot);
  if(summarizeSourceSnapshot(source).snapshotSha256!==args['snapshot-sha256'])throw new Error('SOURCE_HASH_MISMATCH');
  const bytes=await readFile(args.manifest);if(sha256(bytes)!==args['manifest-sha256'])throw new Error('MANIFEST_HASH_MISMATCH');
  const manifest=JSON.parse(bytes);if(manifest.sourceProject!==source.sourceProject)throw new Error('MANIFEST_SOURCE_MISMATCH');
  const credential=JSON.parse(execFileSync('security',['find-generic-password','-a','merotalent','-s','MeroTalent Neon Production Object Storage','-w'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  const endpoint='https://br-falling-breeze-azr6q64l.storage.c-3.ap-southeast-1.aws.neon.tech';
  if(credential.branchId!=='br-falling-breeze-azr6q64l'||credential.endpoint!==endpoint||credential.region!=='ap-southeast-1')throw new Error('UNVERIFIED_PRODUCTION_STORAGE');
  s3=new S3Client({endpoint,region:credential.region,forcePathStyle:true,credentials:{accessKeyId:credential.accessKeyId,secretAccessKey:credential.secretAccessKey}});
  dotenv.config({path:'.migration.env',quiet:true});
  const base=`https://${source.sourceProject}.supabase.co`,secret=process.env.SUPABASE_SECRET_KEY;
  if(base!=='https://dtirpilgzlsfryucanlg.supabase.co'||process.env.SUPABASE_URL!==base||!secret)throw new Error('SOURCE_STORAGE_READ_CREDENTIAL_REQUIRED');
  const buckets=(await s3.send(new ListBucketsCommand({}))).Buckets?.map(b=>b.Name)??[];
  const inventory=[];for(const bucket of buckets)inventory.push(...await listAllBucketObjects(s3,bucket));
  const checks=[],objects=source.storage.objects.map(JSON.parse);
  if(manifest.objects.length!==objects.length)throw new Error('MANIFEST_OBJECT_COVERAGE_CHANGED');
  for(const object of objects){
    if(object.name.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error('NONCANONICAL_OBJECT_KEY');
    const fingerprint=snapshotFingerprint(object.name),expected=manifest.objects.filter(m=>m.bucket===object.bucket_id&&m.pathFingerprint===fingerprint);
    if(expected.length!==1)throw new Error('MANIFEST_OBJECT_MISSING_OR_AMBIGUOUS');
    const url=`${base}/storage/v1/object/authenticated/${encodeURIComponent(object.bucket_id)}/${object.name.split('/').map(encodeURIComponent).join('/')}`;
    const response=await fetch(url,{headers:{authorization:`Bearer ${secret}`,apikey:secret},redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error('SOURCE_OBJECT_GET_FAILED');
    const sourceBytes=Buffer.from(await response.arrayBuffer()),present=inventory.some(t=>t.bucket===object.bucket_id&&t.key===object.name);
    let target=null,targetType=null,targetCacheControl=null;
    if(present){const got=await s3.send(new GetObjectCommand({Bucket:object.bucket_id,Key:object.name}));const targetBytes=Buffer.from(await got.Body.transformToByteArray());target={sha256:sha256(targetBytes),bytes:targetBytes.length};targetType=got.ContentType;targetCacheControl=got.CacheControl;}
    checks.push({bucket:object.bucket_id,pathFingerprint:fingerprint,targetExists:present,...compareObjectProof({expected:expected[0],source:{sha256:sha256(sourceBytes),bytes:sourceBytes.length},target,expectedType:object.metadata?.mimetype,targetType,expectedCacheControl:object.metadata?.cacheControl,targetCacheControl})});
  }
  const references=snapshotStorageReferences(source);
  const summary={sourceObjects:objects.length,targetObjects:inventory.length,verifiedBytes:checks.filter(c=>c.sourceManifestMatch&&c.targetManifestMatch).length,
    missingTarget:checks.filter(c=>!c.targetExists).length,verifiedTypes:checks.filter(c=>c.contentTypeMatch).length,verifiedCacheControl:checks.filter(c=>c.cacheControlMatch).length,
    extraTarget:inventory.filter(t=>!objects.some(o=>o.bucket_id===t.bucket&&o.name===t.key)).length,sourceMissingReferences:references.filter(r=>!r.presentInSource).length,
    missingBuckets:source.storage.buckets.map(JSON.parse).filter(b=>!buckets.includes(b.id)).map(b=>b.id)};
  const report={result:summary.verifiedBytes===objects.length&&summary.verifiedTypes===objects.length&&summary.verifiedCacheControl===objects.length?'PASS':'BLOCKED',at:new Date().toISOString(),targetBranch:credential.branchId,sourceSnapshotSha256:args['snapshot-sha256'],summary,objects:checks,sourceWrites:0,targetWrites:0,authenticatedApplicationUatVerified:false,productionTrafficSwitched:false};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify({...report,objects:undefined}));if(report.result!=='PASS')process.exitCode=2;
}catch(error){console.error(JSON.stringify({result:'FAIL',code:/^[A-Z_]+$/.test(error?.message??'')?error.message:'PRODUCTION_STORAGE_CHECK_FAILED'}));process.exitCode=1;}
finally{s3?.destroy();}
