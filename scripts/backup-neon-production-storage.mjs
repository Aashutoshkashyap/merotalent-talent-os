/** Read-only production S3 backup; restore/fault injection touches private local scratch only. */
import { execFileSync } from 'node:child_process';
import { readFile,writeFile,mkdtemp,lstat,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir,tmpdir } from 'node:os';
import { S3Client,ListBucketsCommand,GetObjectCommand,HeadObjectCommand } from '@aws-sdk/client-s3';
import { sourceSnapshotKey } from './source-snapshot-artifact.mjs';
import { listAllBucketObjects } from './storage-reconciliation-utils.mjs';
import { sha256 } from './recovery-integrity.mjs';
import {sealStorageBackup,openStorageBackup} from './storage-backup-envelope.mjs';
let client,scratch;
try {
  const directory=join(homedir(),'Library','Application Support','MeroTalent','migration-artifacts');
  const folder=await lstat(directory);
  if(!folder.isDirectory()||folder.isSymbolicLink()||folder.uid!==process.getuid()||(folder.mode&0o077))throw Error('PRIVATE_DIRECTORY_REQUIRED');
  const c=JSON.parse(execFileSync('security',['find-generic-password','-a','merotalent','-s','MeroTalent Neon Production Object Storage','-w'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  if(c.branchId!=='br-falling-breeze-azr6q64l'||c.endpoint!=='https://br-falling-breeze-azr6q64l.storage.c-3.ap-southeast-1.aws.neon.tech'||c.region!=='ap-southeast-1')throw Error('TARGET_PIN_MISMATCH');
  client=new S3Client({endpoint:c.endpoint,region:c.region,forcePathStyle:true,credentials:c});
  const inventory=async()=>{const buckets=(await client.send(new ListBucketsCommand({}))).Buckets.map(b=>b.Name).sort();const objects=[];for(const b of buckets)objects.push(...await listAllBucketObjects(client,b));return {buckets,objects:objects.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};};
  const before=await inventory(),objects=[];
  if(before.objects.length!==22)throw Error('REVIEW_CHANGED_OBJECT_INVENTORY');
  for(const item of before.objects){
    const got=await client.send(new GetObjectCommand({Bucket:item.bucket,Key:item.key}));
    const bytes=Buffer.from(await got.Body.transformToByteArray());
    objects.push({bucket:item.bucket,key:item.key,sha256:sha256(bytes),bytes:bytes.length,body:bytes.toString('base64'),etag:got.ETag,lastModified:got.LastModified?.toISOString(),
      metadata:{ContentType:got.ContentType,CacheControl:got.CacheControl,ContentDisposition:got.ContentDisposition,ContentEncoding:got.ContentEncoding,ContentLanguage:got.ContentLanguage,Expires:got.Expires?.toISOString(),Metadata:got.Metadata??{}}});
  }
  for(const object of objects){
    const head=await client.send(new HeadObjectCommand({Bucket:object.bucket,Key:object.key}));
    const metadata={ContentType:head.ContentType,CacheControl:head.CacheControl,ContentDisposition:head.ContentDisposition,ContentEncoding:head.ContentEncoding,ContentLanguage:head.ContentLanguage,Expires:head.Expires?.toISOString(),Metadata:head.Metadata??{}};
    if(head.ETag!==object.etag||head.ContentLength!==object.bytes||head.LastModified?.toISOString()!==object.lastModified||JSON.stringify(metadata)!==JSON.stringify(object.metadata))throw Error('OBJECT_CHANGED_DURING_BACKUP');
  }
  if(JSON.stringify(before)!==JSON.stringify(await inventory()))throw Error('INVENTORY_CHANGED_DURING_BACKUP');
  const bytes=Buffer.from(JSON.stringify({branch:c.branchId,buckets:before.buckets,objects})),hash=sha256(bytes),key=Buffer.from(sourceSnapshotKey(),'base64');
  const envelope=sealStorageBackup(bytes,key);
  const stamp=new Date().toISOString().replace(/[^0-9]/g,'');
  const artifact=join(directory,`production-storage-${stamp}-${hash.slice(0,12)}.aes256gcm.json`);
  await writeFile(artifact,JSON.stringify(envelope),{mode:0o600,flag:'wx'});
  const stored=JSON.parse(await readFile(artifact,'utf8')),plaintext=openStorageBackup(stored,key);
  const recovered=JSON.parse(plaintext);scratch=await mkdtemp(join(tmpdir(),'merotalent-prod-storage-restore-'));
  let restored=0;
  for(const [i,object] of recovered.objects.entries()){
    const path=join(scratch,String(i));await writeFile(path,Buffer.from(object.body,'base64'),{mode:0o600,flag:'wx'});
    const restoredBytes=await readFile(path);if(restoredBytes.length!==object.bytes||sha256(restoredBytes)!==object.sha256)throw Error('RESTORED_OBJECT_MISMATCH');restored++;
  }
  // A deliberately damaged local restore must fail byte verification.
  await writeFile(join(scratch,'0'),Buffer.from('deliberately damaged local rehearsal'));
  const detectsCorruption=sha256(await readFile(join(scratch,'0')))!==recovered.objects[0].sha256;
  if(!detectsCorruption)throw Error('CORRUPTION_NOT_DETECTED');
  const report={result:'PASS',at:new Date().toISOString(),branch:c.branchId,artifact,sha256:hash,encryptedReadbackVerified:true,objects:objects.length,restored,corruptionDetected:detectsCorruption,restoreTarget:'private-local-filesystem',remoteRestoreTested:false,sourceWrites:0,targetWrites:0,productionTrafficSwitched:false};
  await writeFile(join(directory,`production-storage-restore-${stamp}.json`),JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
}catch(e){console.error(JSON.stringify({result:'FAIL',code:/^[A-Z_]+$/.test(e?.message??'')?e.message:'STORAGE_BACKUP_REHEARSAL_FAILED'}));process.exitCode=1;}
finally{client?.destroy();if(scratch)await rm(scratch,{recursive:true,force:true});}
