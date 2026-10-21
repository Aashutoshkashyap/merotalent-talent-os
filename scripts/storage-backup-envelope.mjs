import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
const format='merotalent-production-storage-backup-v1';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function sealStorageBackup(bytes,key){
  if(!Buffer.isBuffer(key)||key.length!==32)throw Error('BACKUP_KEY_INVALID');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(format));
  const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);
  return {format,sha256:digest(bytes),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
export function openStorageBackup(envelope,key){
  if(envelope.format!==format)throw Error('UNREVIEWED_BACKUP_FORMAT');
  if(!Buffer.isBuffer(key)||key.length!==32)throw Error('BACKUP_KEY_INVALID');
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));decipher.setAAD(Buffer.from(format));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
  const bytes=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]);
  if(digest(bytes)!==envelope.sha256)throw Error('ARCHIVE_READBACK_FAILED');
  return bytes;
}
