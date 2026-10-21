/** Pinned, byte-verified metadata-only repair; never copies source data over target data. */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { S3Client, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { readEncryptedSourceSnapshot } from './source-snapshot-artifact.mjs';
import { summarizeSourceSnapshot } from './source-auth-snapshot.mjs';
import { sha256 } from './recovery-integrity.mjs';
import { snapshotFingerprint } from './source-snapshot-reconciliation.mjs';
let client;
try {
  const args = Object.fromEntries(process.argv.slice(2).map(v => { if(v==='--apply') return ['apply',true]; const m=/^--(snapshot|snapshot-sha256|proof|backup|report)=(.+)$/.exec(v); if(!m) throw Error('INVALID_ARGUMENT'); return [m[1],m[2]]; }));
  if(!args.backup?.startsWith('/') || !args.report?.startsWith('/')) throw Error('PRIVATE_PATH_REQUIRED');
  const source=await readEncryptedSourceSnapshot(args.snapshot);
  if(summarizeSourceSnapshot(source).snapshotSha256!==args['snapshot-sha256']) throw Error('SOURCE_HASH_MISMATCH');
  const proof=JSON.parse(await readFile(args.proof,'utf8'));
  if(proof.targetBranch!=='br-falling-breeze-azr6q64l'||proof.sourceSnapshotSha256!==args['snapshot-sha256']||proof.summary.verifiedBytes!==22||proof.summary.verifiedTypes!==22||proof.summary.extraTarget!==0) throw Error('BYTE_PROOF_REQUIRED');
  const c=JSON.parse(execFileSync('security',['find-generic-password','-a','merotalent','-s','MeroTalent Neon Production Object Storage','-w'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  if(c.branchId!=='br-falling-breeze-azr6q64l'||c.endpoint!=='https://br-falling-breeze-azr6q64l.storage.c-3.ap-southeast-1.aws.neon.tech'||c.region!=='ap-southeast-1') throw Error('TARGET_PIN_MISMATCH');
  client=new S3Client({endpoint:c.endpoint,region:c.region,forcePathStyle:true,credentials:c});
  const originals=[],pending=[];
  const manifestBytes=await readFile('docs/neon-storage-byte-manifest-2026-10-13.json');
  if(sha256(manifestBytes)!=='cd1f275e069e865508774033f8f3303ec52e6a853234cc622cb302e84a852a84') throw Error('MANIFEST_HASH_MISMATCH');
  const manifest=JSON.parse(manifestBytes);
  for(const text of source.storage.objects){
    const object=JSON.parse(text), pathFingerprint=snapshotFingerprint(object.name), p=proof.objects.find(p=>p.bucket===object.bucket_id&&p.pathFingerprint===pathFingerprint);
    const got=await client.send(new GetObjectCommand({Bucket:object.bucket_id,Key:object.name}));
    const data=Buffer.from(await got.Body.transformToByteArray());
    // Recheck against the immutable byte manifest, not merely the previous report's booleans.
    const expected=manifest.objects.find(m=>m.bucket===object.bucket_id&&m.pathFingerprint===pathFingerprint);
    if(!p?.targetManifestMatch||!expected||sha256(data)!==expected.sourceSha256||data.length!==expected.sourceBytes||got.ContentType!==object.metadata?.mimetype) throw Error('OBJECT_DRIFT');
    if(!/^max-age=\d+$/.test(object.metadata?.cacheControl??'')) throw Error('UNREVIEWED_CACHE_POLICY');
    const metadata={ContentType:got.ContentType,CacheControl:got.CacheControl,ContentDisposition:got.ContentDisposition,ContentEncoding:got.ContentEncoding,ContentLanguage:got.ContentLanguage,Metadata:got.Metadata};
    originals.push({bucket:object.bucket_id,key:object.name,etag:got.ETag,sha256:sha256(data),metadata});
    if(got.CacheControl!==object.metadata.cacheControl) pending.push({object,got,metadata});
  }
  await writeFile(args.backup,JSON.stringify({targetBranch:c.branchId,at:new Date().toISOString(),objects:originals},null,2),{mode:0o600,flag:'wx'});
  let changed=0;
  if(args.apply) for(const {object,got,metadata} of pending){
    await client.send(new CopyObjectCommand({Bucket:object.bucket_id,Key:object.name,CopySource:`${encodeURIComponent(object.bucket_id)}/${object.name.split('/').map(encodeURIComponent).join('/')}`,CopySourceIfMatch:got.ETag,MetadataDirective:'REPLACE',...metadata,CacheControl:object.metadata.cacheControl}));
    changed++;
  }
  const report={result:'PASS',mode:args.apply?'apply':'dry-run',planned:pending.length,changed,byteProofRechecked:originals.length,sourceWrites:0,objectsDeleted:0,productionTrafficSwitched:false};
  await writeFile(args.report,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
}catch(e){console.error(JSON.stringify({result:'FAIL',code:/^[A-Z_]+$/.test(e?.message??'')?e.message:'STORAGE_METADATA_REPAIR_FAILED'}));process.exitCode=1;}finally{client?.destroy();}
