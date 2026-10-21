/** Synthetic local PostgreSQL only. Does not load source/candidate credentials. */
import pg from 'pg';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {userInfo} from 'node:os';
import {randomUUID} from 'node:crypto';
import {storageStateWriteFence} from './storage-state-write-fence.mjs';
const root=mkdtempSync('/private/tmp/mt-storage-fence-');
const data=join(root,'data'),bin='/opt/homebrew/opt/postgresql@18/bin';
const port=55000+Math.floor(Math.random()*5000);
const run=(name,args)=>promisify(execFile)(join(bin,name),args,{timeout:60000,maxBuffer:1024*1024});
let running=false;const clients=[];let checks=0;
async function connect(){const c=new pg.Client({host:root,port,database:'postgres',user:userInfo().username,connectionTimeoutMillis:5000,query_timeout:10000});c.on('error',()=>{});await c.connect();clients.push(c);return c;}
async function transaction(c,role,operation){await c.query('BEGIN');try{await c.query(`SET LOCAL ROLE ${role}`);const value=await operation(c);await c.query('COMMIT');return value;}catch(error){await c.query('ROLLBACK');throw error;}}
async function denied(c,sql,code='55000'){
 await assert.rejects(transaction(c,'fixture_storage_writer',()=>c.query(sql)),error=>error.code===code);checks++;
}
try{
 await run('initdb',['--no-instructions','--auth=trust','-D',data]);
 await run('pg_ctl',['-D',data,'-l',join(root,'postgres.log'),'-o',`-k ${root} -p ${port} -c listen_addresses=''`,'-w','start']);running=true;
 const admin=await connect(),controller=await connect(),writer=await connect();
 await admin.query(`CREATE ROLE fixture_fence_controller NOLOGIN;
 CREATE ROLE fixture_storage_owner NOLOGIN;
 CREATE ROLE fixture_storage_writer NOLOGIN;
 GRANT CREATE ON DATABASE postgres TO fixture_fence_controller;
 CREATE SCHEMA storage AUTHORIZATION fixture_storage_owner;
 CREATE TABLE storage.objects(name text PRIMARY KEY,body text);
 CREATE TABLE storage.buckets(name text PRIMARY KEY);
 ALTER TABLE storage.objects OWNER TO fixture_storage_owner;
 ALTER TABLE storage.buckets OWNER TO fixture_storage_owner;
 GRANT USAGE ON SCHEMA storage TO fixture_fence_controller,fixture_storage_writer;
 GRANT TRIGGER,SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON storage.objects,storage.buckets TO fixture_fence_controller;
 GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON storage.objects,storage.buckets TO fixture_storage_writer;`);
 const fence=storageStateWriteFence(randomUUID());
 await transaction(controller,'fixture_fence_controller',async c=>{await c.query(fence.install);await fence.verify(c);});
 // Open state must preserve real DELETE semantics, not return NEW/NULL from a row trigger.
 await transaction(writer,'fixture_storage_writer',async c=>{
   await c.query("INSERT INTO storage.objects VALUES('open','a')");
   assert.equal((await c.query("UPDATE storage.objects SET body='b' WHERE name='open'")).rowCount,1);
   assert.equal((await c.query("DELETE FROM storage.objects WHERE name='open'")).rowCount,1);
   await c.query("INSERT INTO storage.objects VALUES('truncate','a'); TRUNCATE storage.objects");
   assert.equal((await c.query('SELECT count(*)::int AS n FROM storage.objects')).rows[0].n,0);
 });checks++;
 await denied(writer,'UPDATE merotalent_migration.storage_freeze SET is_frozen=true','42501');
 await denied(writer,'SELECT merotalent_migration.check_storage_write_fence()','42501');
 await transaction(controller,'fixture_fence_controller',c=>c.query('GRANT UPDATE ON merotalent_migration.storage_freeze TO fixture_storage_writer'));
 await assert.rejects(transaction(controller,'fixture_fence_controller',c=>fence.verify(c)),/STORAGE_FENCE_FUNCTION_MISMATCH/);checks++;
 await transaction(controller,'fixture_fence_controller',c=>c.query('REVOKE UPDATE ON merotalent_migration.storage_freeze FROM fixture_storage_writer'));
 await transaction(controller,'fixture_fence_controller',c=>fence.setFrozen(c,true));
 for(const sql of ["INSERT INTO storage.objects VALUES('blocked','x')",'UPDATE storage.objects SET body=body WHERE false','DELETE FROM storage.objects WHERE false','TRUNCATE storage.objects'])await denied(writer,sql);
 for(const sql of ["INSERT INTO storage.buckets VALUES('blocked')",'UPDATE storage.buckets SET name=name WHERE false','DELETE FROM storage.buckets WHERE false','TRUNCATE storage.buckets'])await denied(writer,sql);
 await transaction(writer,'fixture_storage_writer',c=>c.query('SELECT * FROM storage.objects'));checks++;
 await transaction(controller,'fixture_fence_controller',c=>fence.setFrozen(c,false));
 await transaction(writer,'fixture_storage_writer',c=>c.query("INSERT INTO storage.objects VALUES('restored','x'); DELETE FROM storage.objects WHERE name='restored'"));checks++;
 // Freeze waits for a mutation transaction already inside the open-state guard.
 await writer.query('BEGIN; SET LOCAL ROLE fixture_storage_writer');
 await writer.query("INSERT INTO storage.objects VALUES('inflight','x')");
 const pid=(await controller.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 await controller.query('BEGIN; SET LOCAL ROLE fixture_fence_controller');
 const pending=fence.setFrozen(controller,true);let lockSeen=false;
 for(let i=0;i<100;i++){
   const state=(await admin.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[pid])).rows[0];
   if(state?.wait_event_type==='Lock'){lockSeen=true;break;}
   await new Promise(resolve=>setTimeout(resolve,10));
 }
 assert.equal(lockSeen,true);await writer.query('COMMIT');await pending;await controller.query('COMMIT');checks++;
 await denied(writer,"INSERT INTO storage.objects VALUES('after-freeze','x')");
 await assert.rejects(transaction(controller,'fixture_fence_controller',c=>fence.remove(c)),/STORAGE_FENCE_MUST_BE_OPEN_BEFORE_REMOVAL/);checks++;
 // A transaction carrying an older repeatable-read snapshot cannot use stale open state.
 await transaction(controller,'fixture_fence_controller',c=>fence.setFrozen(c,false));
 await writer.query('BEGIN ISOLATION LEVEL REPEATABLE READ; SET LOCAL ROLE fixture_storage_writer');
 await writer.query('SELECT count(*) FROM storage.objects');
 await transaction(controller,'fixture_fence_controller',c=>fence.setFrozen(c,true));
 await assert.rejects(writer.query("INSERT INTO storage.objects VALUES('stale','x')"),error=>error.code==='40001'||error.code==='55000');await writer.query('ROLLBACK');checks++;
 // Direct DROP TRIGGER is forbidden to this role, but dropping the role's own
 // dedicated function can remove precisely its verified trigger dependency.
 await assert.rejects(transaction(controller,'fixture_fence_controller',c=>c.query('DROP TRIGGER merotalent_storage_write_fence ON storage.objects')),error=>error.code==='42501');checks++;
 await transaction(controller,'fixture_fence_controller',c=>fence.setFrozen(c,false));
 await transaction(writer,'fixture_storage_writer',c=>c.query("DELETE FROM storage.objects WHERE name='inflight'"));checks++;
 const [originalState]=(await transaction(controller,'fixture_fence_controller',c=>c.query('DELETE FROM merotalent_migration.storage_freeze RETURNING *'))).rows;
 await denied(writer,"INSERT INTO storage.objects VALUES('missing-control','x')");
 await transaction(controller,'fixture_fence_controller',c=>c.query('INSERT INTO merotalent_migration.storage_freeze(singleton,is_frozen,fence_id,frozen_at) VALUES($1,$2,$3,$4)',[originalState.singleton,originalState.is_frozen,originalState.fence_id,originalState.frozen_at]));
 await transaction(controller,'fixture_fence_controller',c=>c.query(`CREATE TABLE merotalent_migration.dependency_probe(id integer);
   CREATE TRIGGER extra_probe BEFORE INSERT ON merotalent_migration.dependency_probe FOR EACH STATEMENT EXECUTE FUNCTION merotalent_migration.check_storage_write_fence()`));
 await assert.rejects(transaction(controller,'fixture_fence_controller',c=>fence.remove(c)),/STORAGE_FENCE_UNREVIEWED_DEPENDENCIES/);checks++;
 await transaction(controller,'fixture_fence_controller',c=>c.query('DROP TABLE merotalent_migration.dependency_probe'));
 await transaction(controller,'fixture_fence_controller',c=>fence.remove(c));
 assert.equal((await admin.query("SELECT count(*)::int AS n FROM pg_namespace WHERE nspname='merotalent_migration'")).rows[0].n,0);
 assert.equal((await admin.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid='storage.objects'::regclass AND NOT tgisinternal")).rows[0].n,0);
 assert.equal((await admin.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid='storage.buckets'::regclass AND NOT tgisinternal")).rows[0].n,0);
 await transaction(writer,'fixture_storage_writer',c=>c.query("INSERT INTO storage.objects VALUES('after-cleanup','x'); DELETE FROM storage.objects WHERE name='after-cleanup'"));checks++;
 console.log(JSON.stringify({result:'PASS',checks,scope:'synthetic-private-local-postgresql',privilegedControllerDoesNotOwnStorage:true,
   protectsFourDmlClasses:true,openDeleteWorks:true,unauthorizedStateChangeDenied:true,inflightDatabaseWritersDrained:true,
   staleSnapshotDenied:true,stateReversalWithoutStorageOwner:true,fullRemovalWithoutStorageOwner:true,originalStorageOwnershipUnchanged:true,
   objectBytesQuiescent:false,sourceWrites:0,productionWrites:0}));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,code:error?.code??'REHEARSAL_ASSERTION',sourceWrites:0,productionWrites:0}));process.exitCode=1;}
finally{
 for(const c of clients){await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{});}
 if(running)await run('pg_ctl',['-D',data,'-m','immediate','-w','stop']).catch(()=>{});
 if(/^\/private\/tmp\/mt-storage-fence-[a-zA-Z0-9]+$/.test(root))rmSync(root,{recursive:true,force:true});
}
