/** Reviewable state-controlled metadata fence. Not an object-byte freeze or source installer. */
const schema='merotalent_migration';
const trigger='merotalent_storage_write_fence';
const targets=['storage.buckets','storage.objects'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function storageStateWriteFence(fenceId){
  if(!uuid.test(fenceId??''))throw Error('INVALID_STORAGE_FENCE_ID');
  const body=`DECLARE paused boolean; installed_id uuid;
BEGIN
  SELECT is_frozen,fence_id INTO paused,installed_id FROM ${schema}.storage_freeze WHERE singleton=1 FOR SHARE;
  IF NOT FOUND OR installed_id IS DISTINCT FROM '${fenceId}'::uuid THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='MEROTALENT_STORAGE_FENCE_STATE_INVALID';
  END IF;
  IF paused THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='MEROTALENT_STORAGE_WRITES_PAUSED';
  END IF;
  -- Statement-trigger return values are ignored, including for DELETE/TRUNCATE.
  RETURN NULL;
END;`;
  // Deliberately no IF NOT EXISTS / OR REPLACE: never adopt unknown existing objects.
  const install=`SET LOCAL lock_timeout='5s';
LOCK TABLE ${targets.join(',')} IN SHARE ROW EXCLUSIVE MODE;
CREATE SCHEMA ${schema};
REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC;
CREATE TABLE ${schema}.storage_freeze(singleton smallint PRIMARY KEY CHECK(singleton=1),
  is_frozen boolean NOT NULL,fence_id uuid NOT NULL,frozen_at timestamptz,
  CHECK(is_frozen=(frozen_at IS NOT NULL)));
REVOKE ALL ON TABLE ${schema}.storage_freeze FROM PUBLIC;
INSERT INTO ${schema}.storage_freeze VALUES(1,false,'${fenceId}'::uuid,NULL);
CREATE FUNCTION ${schema}.check_storage_write_fence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fence$${body}$fence$;
REVOKE ALL ON FUNCTION ${schema}.check_storage_write_fence() FROM PUBLIC;
${targets.map(target=>`CREATE TRIGGER ${trigger} BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON ${target}
FOR EACH STATEMENT EXECUTE FUNCTION ${schema}.check_storage_write_fence();`).join('\n')}`;
  return {install,body,async verify(client){
    const [fn]=(await client.query(`SELECT p.prosrc,p.prosecdef,p.proconfig,
      p.proowner=n.nspowner AND p.proowner=c.relowner AS same_owner,
      EXISTS(SELECT 1 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE a.grantee<>n.nspowner) AS schema_exposed,
      EXISTS(SELECT 1 FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee<>c.relowner) AS state_exposed,
      EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner) AS function_exposed
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      JOIN pg_class c ON c.relnamespace=n.oid AND c.relname='storage_freeze'
      WHERE n.nspname=$1 AND p.proname='check_storage_write_fence'`,[schema])).rows;
    if(!fn||fn.prosrc!==body||!fn.prosecdef||!fn.same_owner||
      fn.schema_exposed||fn.state_exposed||fn.function_exposed||
      !fn.proconfig?.includes('search_path=""'))throw Error('STORAGE_FENCE_FUNCTION_MISMATCH');
    const rows=(await client.query(`SELECT t.tgtype::int AS type,t.tgenabled,
      p.prosrc,n.nspname,t.tgrelid::regclass::text AS target FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
      JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE t.tgrelid IN('storage.objects'::regclass,'storage.buckets'::regclass) AND t.tgname=$1`,[trigger])).rows;
    if(rows.length!==targets.length||targets.some(target=>!rows.some(row=>row.target===target&&row.type===62&&row.tgenabled==='O'&&row.prosrc===body&&row.nspname===schema)))throw Error('STORAGE_FENCE_TRIGGER_MISMATCH');
    const state=(await client.query(`SELECT is_frozen,fence_id FROM ${schema}.storage_freeze WHERE singleton=1`)).rows;
    if(state.length!==1||state[0].fence_id!==fenceId)throw Error('STORAGE_FENCE_STATE_MISMATCH');
    return {frozen:state[0].is_frozen,metadataFenceVerified:true,objectBytesQuiescent:false};
  },async setFrozen(client,frozen){
    if(typeof frozen!=='boolean')throw Error('INVALID_STORAGE_FENCE_STATE');
    await this.verify(client);
    // Caller must hold a transaction through COMMIT. This lock drains earlier
    // DML and prevents new statements racing the state transition. SELECT stays available.
    await client.query(`SET LOCAL lock_timeout='5s'; LOCK TABLE ${targets.join(',')} IN SHARE ROW EXCLUSIVE MODE`);
    const changed=await client.query(`UPDATE ${schema}.storage_freeze SET is_frozen=$1,
      frozen_at=CASE WHEN $1 THEN clock_timestamp() ELSE NULL END WHERE singleton=1 AND fence_id=$2::uuid`,[frozen,fenceId]);
    if(changed.rowCount!==1)throw Error('STORAGE_FENCE_STATE_MISMATCH');
  },async remove(client){
    const state=await this.verify(client);
    if(state.frozen)throw Error('STORAGE_FENCE_MUST_BE_OPEN_BEFORE_REMOVAL');
    await client.query(`SET LOCAL lock_timeout='5s'; LOCK TABLE ${targets.join(',')} IN SHARE ROW EXCLUSIVE MODE`);
    // PostgreSQL permits the function owner to remove its own dependency tree.
    // CASCADE is permitted ONLY when dependents are our two exact verified
    // triggers. Never cascade an unreviewed function/table/schema dependency graph.
    const [dependencies]=(await client.query(`SELECT count(*)::int AS total,
      count(*) FILTER(WHERE d.classid='pg_trigger'::regclass AND d.objid IN
        (SELECT t.oid FROM pg_trigger t WHERE t.tgrelid IN('storage.objects'::regclass,'storage.buckets'::regclass) AND t.tgname=$1))::int AS expected_trigger
      FROM pg_depend d WHERE d.refclassid='pg_proc'::regclass AND d.refobjid=$2::regprocedure`,
      [trigger,`${schema}.check_storage_write_fence()`])).rows;
    if(dependencies?.total!==targets.length||dependencies.expected_trigger!==targets.length)throw Error('STORAGE_FENCE_UNREVIEWED_DEPENDENCIES');
    await client.query(`DROP FUNCTION ${schema}.check_storage_write_fence() CASCADE;
      DROP TABLE ${schema}.storage_freeze;
      DROP SCHEMA ${schema};`);
  }};
}
