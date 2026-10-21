/** Synthetic-only S3 capability probe. Never writes a migrated object or production bucket. */
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand,HeadObjectCommand } from "@aws-sdk/client-s3";
dotenv.config({path:".migration.env",quiet:true});
const branch="br-frosty-haze-azsnybmr",endpoint=`https://${branch}.storage.c-3.ap-southeast-1.aws.neon.tech`;
if(process.env.VERCEL_ENV==="production"||process.env.NEON_STAGING_BRANCH_ID!==branch||process.env.AWS_ENDPOINT_URL_S3!==endpoint)throw new Error("STAGING_ONLY");
const client=new S3Client({endpoint,region:"ap-southeast-1",forcePathStyle:true,credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
const key=`migration-verification/metadata-${randomUUID()}.txt`,bucket="resumes",body=Buffer.from("synthetic metadata proof");
let created=false;
try {
  await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:body,ContentType:"text/plain",CacheControl:"max-age=3600",Metadata:{purpose:"synthetic-probe"},IfNoneMatch:"*"}));created=true;
  const first=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));
  const initialMetadata=first.CacheControl==="max-age=3600"&&first.Metadata?.purpose==="synthetic-probe";
  const initialBytes=Buffer.from(await first.Body.transformToByteArray()).equals(body);
  let staleWriteDenied=false;
  try {
    await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:Buffer.from("must not overwrite"),IfMatch:'"not-the-etag"'}));
  } catch(e) { if(e?.$metadata?.httpStatusCode===412)staleWriteDenied=true;else throw e; }
  const after=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));
  const staleWritePreservedBytes=Buffer.from(await after.Body.transformToByteArray()).equals(body);
  const passed=initialMetadata&&initialBytes&&staleWriteDenied&&staleWritePreservedBytes;
  console.log(JSON.stringify({result:passed?"PASS":"BLOCKED",initialMetadata,initialBytes,staleWriteDenied,staleWritePreservedBytes,existingObjectsModified:0,productionWrites:0}));
  if(!passed)process.exitCode=2;
} catch(e) {
  console.error(JSON.stringify({result:"FAIL",code:"SYNTHETIC_METADATA_PROBE_FAILED",httpStatus:e?.$metadata?.httpStatusCode??null}));process.exitCode=1;
} finally {
  if(created) {
    await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));
    let removed=false;
    try{await client.send(new HeadObjectCommand({Bucket:bucket,Key:key}));}catch(e){if(e?.$metadata?.httpStatusCode===404)removed=true;else throw e;}
    console.log(JSON.stringify({syntheticObjectCleanup:removed?"PASS":"FAIL"}));if(!removed)process.exitCode=1;
  }
  client.destroy();
}
