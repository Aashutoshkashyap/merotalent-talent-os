import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {sealStorageBackup,openStorageBackup} from './storage-backup-envelope.mjs';
test('production storage archive preserves binary bytes and uses randomized encryption',()=>{
  const key=randomBytes(32),bytes=randomBytes(1024),a=sealStorageBackup(bytes,key),b=sealStorageBackup(bytes,key);
  assert.deepEqual(openStorageBackup(a,key),bytes);assert.notEqual(a.ciphertext,b.ciphertext);
});
test('wrong key and tampered encrypted bytes never restore',()=>{
  const key=randomBytes(32),envelope=sealStorageBackup(Buffer.from('private object'),key);
  assert.throws(()=>openStorageBackup(envelope,randomBytes(32)));
  const changed=Buffer.from(envelope.ciphertext,'base64');changed[0]^=1;
  assert.throws(()=>openStorageBackup({...envelope,ciphertext:changed.toString('base64')},key));
});
test('wrong format and incorrect plaintext digest fail closed',()=>{
  const key=randomBytes(32),e=sealStorageBackup(Buffer.from('data'),key);
  assert.throws(()=>openStorageBackup({...e,format:'another-system'},key),/UNREVIEWED_BACKUP_FORMAT/);
  assert.throws(()=>openStorageBackup({...e,sha256:'0'.repeat(64)},key),/ARCHIVE_READBACK_FAILED/);
});
test('invalid keys are rejected before encryption or restoration',()=>{
  assert.throws(()=>sealStorageBackup(Buffer.from('data'),randomBytes(16)),/BACKUP_KEY_INVALID/);
  assert.throws(()=>openStorageBackup({format:'merotalent-production-storage-backup-v1'},randomBytes(16)),/BACKUP_KEY_INVALID/);
});
