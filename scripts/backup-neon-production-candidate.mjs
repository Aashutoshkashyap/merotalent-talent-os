/** READ ONLY remote backup; restoration occurs only on a newly created private local socket. */
import dotenv from "dotenv";
import pg from "pg";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, lstatSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { sourceSnapshotKey, readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { portableSourceSchema, rehearsePortableSchema } from "./portable-source-schema.mjs";
import { rehearseRuntimeFoundation } from "./runtime-foundation-rehearsal.mjs";
import { rehearseCandidatePrecision } from "./candidate-precision-repair.mjs";
import {committedWriteJournal,replayCommittedWriteJournal} from './committed-write-replay.mjs';
import {sourceDatabaseWriteFence} from './source-database-write-fence.mjs';
import { applyEventActivitiesChecked } from './event-activities-migration.mjs';
import { sha256, tableFingerprintsBatched as tableFingerprints, schemaFingerprints, assertFingerprints, compareRecoveryEvidence, quoteIdentifier as q } from "./recovery-integrity.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
let remote, local, replayLocal, running = false, phase = "preflight", remoteConnectionFailed = false;
const scratch = mkdtempSync(join(tmpdir(), "mt-production-backup-"));
const socket = mkdtempSync(join(process.platform === "darwin" ? "/private/tmp" : tmpdir(), "mt-restore-"));
const data = join(scratch, "postgres"), archive = join(scratch, "candidate.backup");
const bin = process.env.PG_BIN_DIR || "/opt/homebrew/opt/postgresql@18/bin";
const port = 55000 + Math.floor(Math.random() * 5000);
const localEnv = { ...process.env, PGHOST: socket, PGPORT: String(port), PGDATABASE: "postgres",
  PGUSER: process.env.USER || "postgres", PGPASSWORD: "", PGSSLMODE: "disable" };
// Keep the exported-snapshot client responsive while pg_dump uses another connection.
const execFileAsync = promisify(execFile);
const run = (name, args, env) => execFileAsync(join(bin, name), args,
  { env, stdio: ["ignore", "pipe", "pipe"], timeout: 180000, maxBuffer: 20 * 1024 * 1024 });
try {
  if(process.argv.includes('--rehearse-committed-write-replay')&&process.argv.some(arg=>['--rehearse-portable-source','--rehearse-runtime-foundation','--rehearse-generated-ids','--rehearse-candidate-precision'].includes(arg)))throw Error('COMMITTED_REPLAY_REQUIRES_DEDICATED_RESTORE');
  const fenceSnapshot=process.argv.find(arg=>arg.startsWith('--rehearse-source-database-fence='))?.slice('--rehearse-source-database-fence='.length);
  if(fenceSnapshot&&process.argv.some(arg=>arg==='--rehearse-committed-write-replay'||['--rehearse-portable-source','--rehearse-runtime-foundation','--rehearse-generated-ids','--rehearse-candidate-precision'].includes(arg)))throw Error('SOURCE_FENCE_REQUIRES_DEDICATED_RESTORE');
  const target = productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL);
  const directory = join(homedir(), "Library", "Application Support", "MeroTalent", "migration-artifacts");
  const folder = lstatSync(directory);
  if (!folder.isDirectory() || folder.isSymbolicLink() || folder.uid !== process.getuid() || folder.mode & 0o077) throw new Error("PRIVATE_ARTIFACT_DIRECTORY_REQUIRED");
  const key = Buffer.from(sourceSnapshotKey(), "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY_REQUIRED");
  const env = { ...process.env, PGHOST: target.hostname, PGPORT: "5432", PGDATABASE: "neondb",
    PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password),
    PGSSLMODE: "verify-full", PGSSLROOTCERT: "system", PGCONNECT_TIMEOUT: "15", PGOPTIONS: "-c default_transaction_read_only=on" };
  for (const name of ["PGHOSTADDR", "PGSERVICE", "PGSERVICEFILE", "PGPASSFILE", "PGOPTIONS"]) delete localEnv[name];
  for (const name of ["PGHOSTADDR", "PGSERVICE", "PGSERVICEFILE", "PGPASSFILE"]) delete env[name];
  remote = new pg.Client({ connectionString: target.href, connectionTimeoutMillis: 15000, query_timeout: 30000 });
  remote.on("error", () => { remoteConnectionFailed = true; });
  await remote.connect();
  await remote.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await remote.query("SET LOCAL TIME ZONE 'UTC'");
  await remote.query("SET LOCAL statement_timeout='30s'");
  if ((await remote.query("SELECT current_setting('transaction_read_only') AS ro")).rows[0].ro !== "on") throw new Error("REMOTE_READ_ONLY_REQUIRED");
  const snapshot = (await remote.query("SELECT pg_export_snapshot() AS id")).rows[0].id;
  const rows = await tableFingerprints(remote), schema = await schemaFingerprints(remote);
  const roles = (await remote.query("SELECT DISTINCT unnest(roles)::text AS name FROM pg_policies WHERE schemaname NOT LIKE 'pg_%' AND schemaname <> 'information_schema'")).rows.map(row => row.name).filter(name => name !== "public");
  phase = "dump";
  await run("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--lock-wait-timeout=15s", `--snapshot=${snapshot}`, `--file=${archive}`], env);
  const bytes = readFileSync(archive), hash = sha256(bytes), iv = randomBytes(12);
  const aad = Buffer.from("merotalent-production-candidate-backup-v1");
  const cipher = createCipheriv("aes-256-gcm", key, iv); cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]), tag = cipher.getAuthTag();
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "");
  const artifact = join(directory, `production-candidate-${stamp}-${hash.slice(0, 12)}.aes256gcm.json`);
  writeFileSync(artifact, JSON.stringify({ format: aad.toString(), sha256: hash,
    iv: iv.toString("base64"), tag: tag.toString("base64"), ciphertext: ciphertext.toString("base64") }), { mode: 0o600, flag: "wx" });
  const stored = JSON.parse(readFileSync(artifact, "utf8"));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "base64"));
  decipher.setAAD(aad); decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
  const restoredArchive = Buffer.concat([decipher.update(Buffer.from(stored.ciphertext, "base64")), decipher.final()]);
  if (sha256(restoredArchive) !== hash) throw new Error("BACKUP_READBACK_MISMATCH");
  writeFileSync(archive, restoredArchive, { mode: 0o600 });
  await remote.query("ROLLBACK");
  await remote.end(); remote = null;
  if (remoteConnectionFailed) throw new Error("PRODUCTION_CANDIDATE_CONNECTION_LOST");
  phase = "local_restore";
  await run("initdb", ["--no-instructions", "--auth=trust", "-D", data], process.env);
  await run("pg_ctl", ["-D", data, "-l", join(scratch, "postgres.log"), "-o", `-k ${socket} -p ${port} -c listen_addresses=''`, "-w", "start"], process.env); running = true;
  local = new pg.Client({ host: socket, port, database: "postgres", user: localEnv.PGUSER }); await local.connect();
  for (const role of roles) if (role !== localEnv.PGUSER) await local.query(`CREATE ROLE ${q(role)} NOLOGIN`);
  await run("pg_restore", ["--exit-on-error", "--no-owner", "--no-privileges", "-d", "postgres", archive], localEnv);
  await local.query("SET TIME ZONE 'UTC'");
  phase = "integrity";
  assertFingerprints(rows, await tableFingerprints(local));
  const differences = compareRecoveryEvidence(schema, await schemaFingerprints(local));
  if (differences.length) throw new Error("RESTORED_SCHEMA_MISMATCH");
  let sourceDatabaseFenceRehearsal=null;
  if(fenceSnapshot){
    phase='local_source_database_fence_rehearsal';
    const captured=await readEncryptedSourceSnapshot(fenceSnapshot);
    if(captured.sourceProject!=='dtirpilgzlsfryucanlg'||captured.transactionReadOnly!=='on')throw Error('VERIFIED_SOURCE_SNAPSHOT_REQUIRED');
    const localTables=(await local.query("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname")).rows.map(row=>row.relname);
    if(captured.publicTableNames.some(table=>!localTables.includes(table)))throw Error('SOURCE_TABLE_MISSING_IN_LOCAL_RESTORE');
    // Candidate-only public runtime tables must also be fenced in the rehearsal.
    const fence=sourceDatabaseWriteFence({tables:localTables,fenceId:randomUUID(),includeStorage:false});
    if(!(await fence.preflight(local)).ready)throw Error('LOCAL_FENCE_OWNERSHIP_REQUIRED');
    await local.query('BEGIN');await local.query(fence.install);await local.query('COMMIT');
    const coverage=await fence.verify(local);
    const attempts=[`INSERT INTO public.skills(id,name) VALUES('${randomUUID()}'::uuid,'Local fence test')`,
      'UPDATE public.skills SET name=name WHERE false','DELETE FROM public.skills WHERE false','TRUNCATE public.skills CASCADE'];
    let blocked=0;
    for(const sql of attempts){
      await local.query('BEGIN');try{await local.query(sql);}catch(error){if(error.code!=='55000'||error.message!=='MEROTALENT_MIGRATION_WRITES_PAUSED')throw error;blocked++;}finally{await local.query('ROLLBACK');}
    }
    if(blocked!==attempts.length)throw Error('SOURCE_DATABASE_FENCE_FAILED');
    await local.query('SELECT count(*) FROM public.skills');
    assertFingerprints(rows,await tableFingerprints(local));
    await local.query('BEGIN');await fence.remove(local);await local.query('COMMIT');
    assertFingerprints(rows,await tableFingerprints(local));
    if(compareRecoveryEvidence(schema,await schemaFingerprints(local)).length)throw Error('SOURCE_FENCE_REMOVAL_CHANGED_SCHEMA');
    sourceDatabaseFenceRehearsal={...coverage,blockedOperations:blocked,readsAllowed:true,rowsUnchanged:true,originalSchemaRestored:true,
      installedIn:'private-local-restored-candidate',sourceWrites:0,remoteWrites:0,sourceFreezeExecuted:false};
  }
  let committedWriteReplayRehearsal=null;
  if(process.argv.includes('--rehearse-committed-write-replay')){
    phase='local_committed_write_replay';
    // Clone only this freshly restored private Unix-socket database. Neither
    // the remote candidate nor Supabase is a replay destination.
    await local.query('CREATE DATABASE merotalent_replay_rehearsal TEMPLATE postgres');
    replayLocal=new pg.Client({host:socket,port,database:'merotalent_replay_rehearsal',user:localEnv.PGUSER});await replayLocal.connect();
    await replayLocal.query("SET TIME ZONE 'UTC'");
    if((await local.query(`SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid='public.skills'::regclass AND NOT tgisinternal AND tgenabled<>'D'`)).rows[0].n!==0)throw Error('REPLAY_FIXTURE_TRIGGER_REQUIRES_REVIEW');
    const columns=(await local.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='skills' ORDER BY ordinal_position`)).rows.map(row=>row.column_name);
    const capture=async db=>(await db.query('SELECT to_jsonb(t)::text AS raw FROM public.skills t ORDER BY id')).rows.map(row=>row.raw);
    const before=await capture(local);if(!before.length)throw Error('REPLAY_BASELINE_RECORD_REQUIRED');
    const existingId=JSON.parse(before[0]).id;
    await local.query('BEGIN');
    await local.query('UPDATE public.skills SET category=$2 WHERE id=$1::uuid',[existingId,'Local committed-write recovery rehearsal only']);
    await local.query(`INSERT INTO public.skills(id,name,category) VALUES($1::uuid,'Local recovery fixture','Private local rehearsal only')`,[randomUUID()]);
    await local.query('COMMIT');
    const after=await capture(local),afterFingerprints=await tableFingerprints(local);
    const journal=committedWriteJournal({table:'skills',before,after,columns,keys:['id']});
    await replayLocal.query('BEGIN');
    let conflictDenied=false;
    try{
      await replayLocal.query('UPDATE public.skills SET category=$2 WHERE id=$1::uuid',[existingId,'Independent local change must not be overwritten']);
      await replayCommittedWriteJournal(replayLocal,journal);
    }catch(error){if(error.message!=='REPLAY_CONFLICT_NO_OVERWRITE')throw error;conflictDenied=true;}
    finally{await replayLocal.query('ROLLBACK');}
    if(!conflictDenied)throw Error('REPLAY_FAILED_TO_DENY_CONFLICT');
    assertFingerprints(rows,await tableFingerprints(replayLocal));
    await replayLocal.query('BEGIN');const replayed=await replayCommittedWriteJournal(replayLocal,journal);await replayLocal.query('SET CONSTRAINTS ALL IMMEDIATE');await replayLocal.query('COMMIT');
    assertFingerprints(afterFingerprints,await tableFingerprints(replayLocal));
    if(compareRecoveryEvidence(schema,await schemaFingerprints(replayLocal)).length)throw Error('REPLAY_CHANGED_SCHEMA');
    let duplicateDenied=false;await replayLocal.query('BEGIN');
    try{await replayCommittedWriteJournal(replayLocal,journal);}catch(error){if(error.message!=='REPLAY_CONFLICT_NO_OVERWRITE')throw error;duplicateDenied=true;}
    finally{await replayLocal.query('ROLLBACK');}
    if(!duplicateDenied)throw Error('REPLAY_DUPLICATE_NOT_DENIED');
    assertFingerprints(afterFingerprints,await tableFingerprints(replayLocal));
    const auth=values=>values.filter(row=>row.schema==='neon_auth'||['neon_identity_links','neon_application_accounts','user_roles','user_module_capabilities','entity_admin_assignments','entity_feature_grants'].includes(row.name));
    assertFingerprints(auth(rows),auth(afterFingerprints));
    committedWriteReplayRehearsal={...replayed,committedBeforeReplay:true,allTableFingerprintsMatched:true,identityAndGrantsUnchanged:true,conflictDenied,duplicateDenied,replayTarget:'private-local-restored-candidate-clone',remoteWrites:0,liveRollbackExecuted:false};
    await replayLocal.end();replayLocal=null;
  }
  let portableSchemaRehearsal = null;
  const sourceIndex = process.argv.indexOf("--rehearse-portable-source");
  if (sourceIndex !== -1) {
    phase = "local_portable_schema_rehearsal";
    const source = await readEncryptedSourceSnapshot(process.argv[sourceIndex + 1]);
    portableSchemaRehearsal = await rehearsePortableSchema(local, portableSourceSchema(source));
    // Schema DDL must not change any original business or Managed Auth row.
    assertFingerprints(rows, await tableFingerprints(local));
    for (const view of ["institute_directory", "public_profile_directory"]) {
      await local.query(`SELECT count(*) FROM public.${q(view)}`);
    }
  }
  let runtimeFoundationRehearsal = null;
  if (process.argv.includes("--rehearse-runtime-foundation")) {
    phase = "local_runtime_foundation_rehearsal";
    runtimeFoundationRehearsal = await rehearseRuntimeFoundation(local);
  }
  let generatedIdsRehearsal = null;
  if (process.argv.includes("--rehearse-generated-ids")) {
    phase = "local_generated_ids_rehearsal";
    const sql = readFileSync(new URL("./sql/neon-production-generated-ids.sql", import.meta.url), "utf8");
    const before = await tableFingerprints(local);
    await local.query("BEGIN");
    await local.query(sql);
    assertFingerprints(before, await tableFingerprints(local));
    await local.query("COMMIT");
    const sequenceBefore = (await local.query("SELECT sequencename,last_value::text FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows;
    await local.query(sql);
    const sequenceAfter = (await local.query("SELECT sequencename,last_value::text FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows;
    if (JSON.stringify(sequenceBefore)!==JSON.stringify(sequenceAfter)) throw new Error("GENERATED_ID_REPAIR_NOT_IDEMPOTENT");
    const defaults = (await local.query(`SELECT table_name,column_default FROM information_schema.columns
      WHERE table_schema='public' AND column_name='id' AND table_name IN ('audit_logs','guest_college_verification_sends')`)).rows;
    if (defaults.length!==2 || defaults.some(row=>!row.column_default?.startsWith('nextval('))) throw new Error("GENERATED_DEFAULT_MISSING");
    generatedIdsRehearsal = { sqlSha256: sha256(sql), defaultsVerified: 2, idempotent: true, originalRowsUnchanged: true };
  }
  let candidatePrecisionRehearsal = null;
  if (process.argv.includes("--rehearse-candidate-precision")) {
    phase = "local_candidate_precision_rehearsal";
    const baselinePath = process.argv.find(v=>v.startsWith('--baseline='))?.slice(11);
    const sourcePath = process.argv.find(v=>v.startsWith('--source='))?.slice(9);
    candidatePrecisionRehearsal = await rehearseCandidatePrecision(local,
      await readEncryptedSourceSnapshot(baselinePath),await readEncryptedSourceSnapshot(sourcePath));
  }
  let eventActivitiesRehearsal = null;
  if (process.argv.includes('--rehearse-event-activities')) {
    phase = 'local_event_activities_rehearsal';
    await local.query('BEGIN');
    eventActivitiesRehearsal = await applyEventActivitiesChecked(local);
    await local.query('COMMIT');
  }
  const report = { result: "PASS", target: "existing-production-candidate", artifact, archiveSha256: hash, eventActivitiesRehearsal,
    tables: rows.length, rows: rows.reduce((n, r) => n + r.count, 0), encryptedReadbackVerified: true,
    restoredFromEncryptedArchive: true, applicationRowAndSchemaFingerprintsVerified: true,
    remoteWrites: 0, productionCutover: false, portableSchemaRehearsal, runtimeFoundationRehearsal, generatedIdsRehearsal, candidatePrecisionRehearsal,committedWriteReplayRehearsal,sourceDatabaseFenceRehearsal,
    exclusions: ["global role passwords/ACLs", "Neon control-plane Auth settings", "object bytes and live object-store restoration"] };
  writeFileSync(join(directory, `production-candidate-restore-${stamp}.json`), JSON.stringify(report, null, 2), { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify(report));
} catch (error) {
  // Classify subprocess failure without emitting stderr: libpq can include credentials.
  const diagnostic=String(error?.stderr??'');
  const category=/snapshot.*(does not exist|invalid)/i.test(diagnostic)?'EXPORTED_SNAPSHOT_UNAVAILABLE':
    /permission denied/i.test(diagnostic)?'DUMP_PERMISSION_DENIED':
    /timeout|timed out/i.test(diagnostic)||error?.code==='ETIMEDOUT'?'BOUNDED_TIMEOUT':
    /connection|connect to server/i.test(diagnostic)?'DUMP_CONNECTION_FAILED':'UNCLASSIFIED';
  console.error(JSON.stringify({ result: "FAIL", phase, code: /^[A-Z_]+$/.test(error?.message ?? "") ? error.message : "PRODUCTION_CANDIDATE_BACKUP_FAILED",category,subprocessStatus:Number.isInteger(error?.status)?error.status:null, remoteWrites: 0 }));
  process.exitCode = 1;
} finally {
  await remote?.query("ROLLBACK").catch(() => {}); await remote?.end().catch(() => {}); await replayLocal?.end().catch(()=>{});await local?.end().catch(() => {});
  let stopped = !running;
  if (running) try { await run("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"], process.env); stopped = true; } catch { console.error("LOCAL_RESTORE_STOP_FAILED"); process.exitCode = 1; }
  if (stopped) { rmSync(scratch, { recursive: true }); rmSync(socket, { recursive: true }); }
}
