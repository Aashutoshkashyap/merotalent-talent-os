/** Compatibility entry point: one hardened storage-fence implementation only. */
import {storageStateWriteFence} from './storage-state-write-fence.mjs';
export function storageWriteFence({fenceId}={}){
 const fence=storageStateWriteFence(fenceId);
 return {...fence,controlTable:'merotalent_migration.storage_freeze',
   functionName:'merotalent_migration.check_storage_write_fence',triggerName:'merotalent_storage_write_fence',
   async preflight(client){
     const rows=(await client.query(`SELECT c.relname,
       has_table_privilege(current_user,c.oid,'TRIGGER') AS can_trigger,
       has_table_privilege(current_user,c.oid,'UPDATE') AS can_lock,
       has_schema_privilege(current_user,n.oid,'USAGE') AS can_use_schema,
       has_database_privilege(current_user,current_database(),'CREATE') AS can_create_schema
       FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='storage' AND c.relname IN ('buckets','objects') AND c.relkind='r'`)).rows;
     if(rows.length!==2||!['buckets','objects'].every(name=>rows.some(row=>row.relname===name)))throw Error('STORAGE_FENCE_TABLE_MISSING');
     return {ready:rows.every(row=>row.can_trigger&&row.can_lock&&row.can_use_schema&&row.can_create_schema),
       canTrigger:rows.every(row=>row.can_trigger),objectBytesQuiescent:false};
   },
   async activate(client,activeFenceId=fenceId){
     if(activeFenceId!==fenceId)throw Error('STORAGE_FENCE_ID_MISMATCH');
     await fence.setFrozen(client,true);return {...await fence.verify(client),fenceId};
   },
   async deactivate(client){await fence.setFrozen(client,false);return {...await fence.verify(client),fenceId};},
   async status(client){return {...await fence.verify(client),fenceId};},
 };
}
