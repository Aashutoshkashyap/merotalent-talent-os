import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { compareObjectProof,snapshotStorageReferences } from "./snapshot-storage-checks.mjs";
test("missing, wrong bytes, and wrong type never pass a storage proof",()=>{
  const expected={sourceSha256:"good",sourceBytes:2};
  const result=compareObjectProof({expected,source:{sha256:"bad",bytes:2},target:null,expectedType:"application/pdf",targetType:"text/plain"});
  assert.deepEqual(result,{sourceManifestMatch:false,targetManifestMatch:false,contentTypeMatch:false,cacheControlMatch:true});
  assert.equal(compareObjectProof({expected,expectedCacheControl:"max-age=3600"}).cacheControlMatch,false);
});
test("historical missing resumes are identified by exact key and not hidden as successful migration",()=>{
  const snapshot={public:{profiles:[JSON.stringify({resume_url:"user/missing.pdf"}),JSON.stringify({resume_url:"user/available.pdf"})]},storage:{objects:[JSON.stringify({bucket_id:"resumes",name:"user/available.pdf"})]}};
  const refs=snapshotStorageReferences(snapshot);
  assert.equal(refs.length,2);assert.equal(refs.filter(r=>!r.presentInSource).length,1);
});
test("metadata repair refuses unapproved enablement and production execution before reading snapshots",()=>{
  const command=["scripts/reconcile-snapshot-storage-staging.mjs","--mode=repair-cache","--target=br-frosty-haze-azsnybmr","--report=/private/tmp/unused-metadata-report.json",`--manifest-sha256=${"0".repeat(64)}`];
  const env={...process.env,NEON_STAGING_BRANCH_ID:"br-frosty-haze-azsnybmr",AWS_ENDPOINT_URL_S3:"https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech",NEON_STAGING_STORAGE_METADATA_REPAIR:"",VERCEL_ENV:"preview"};
  const disabled=spawnSync(process.execPath,command,{env,encoding:"utf8"});
  assert.notEqual(disabled.status,0);assert.match(disabled.stderr,/STAGING_METADATA_REPAIR_NOT_ENABLED/);
  const production=spawnSync(process.execPath,command,{env:{...env,VERCEL_ENV:"production"},encoding:"utf8"});
  assert.notEqual(production.status,0);assert.match(production.stderr,/UNVERIFIED_STAGING_STORAGE/);
});
