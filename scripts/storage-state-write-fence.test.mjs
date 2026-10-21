import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storageStateWriteFence} from './storage-state-write-fence.mjs';
const id='10000000-0000-4000-8000-000000000001';
test('statement fence covers DELETE and TRUNCATE without skipping rows when open',()=>{
 const f=storageStateWriteFence(id);
 assert.match(f.install,/INSERT OR UPDATE OR DELETE OR TRUNCATE/);
 assert.match(f.install,/FOR EACH STATEMENT/);assert.match(f.body,/FOR SHARE/);
 assert.match(f.install,/REVOKE ALL ON TABLE/);assert.match(f.install,/REVOKE ALL ON FUNCTION/);
 assert.doesNotMatch(f.install,/IF NOT EXISTS|OR REPLACE|ALTER ROLE|ALTER OWNER|DISABLE ROW/);
});
test('SQL identifiers cannot be injected through the fence identifier',()=>{
 for(const value of [null,'x',"x'; DROP TABLE storage.objects;--"])assert.throws(()=>storageStateWriteFence(value),/INVALID_STORAGE_FENCE_ID/);
});
test('toggle refuses missing or altered control function before changing state',async()=>{
 const calls=[];await assert.rejects(storageStateWriteFence(id).setFrozen({query:async sql=>{calls.push(sql);return {rows:[]};}},true),/STORAGE_FENCE_FUNCTION_MISMATCH/);
 assert.equal(calls.length,1);assert.match(calls[0],/^SELECT/);
});
test('toggle rejects an untyped value without database access',async()=>{
 await assert.rejects(storageStateWriteFence(id).setFrozen({query:()=>{throw Error('must not query');}},'false'),/INVALID_STORAGE_FENCE_STATE/);
});
