/** A complete application/Auth recovery snapshot in one read-only SELECT. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { assertInventorySelect } from "./read-only-query-policy.mjs";

const sourceProject = "dtirpilgzlsfryucanlg";
const namePattern = /^[a-z][a-z0-9_]*$/;
const quote = value => `"${value.replaceAll('"', '""')}"`;
const rows = table => `(SELECT COALESCE(jsonb_agg(to_jsonb(t)::text ORDER BY to_jsonb(t)::text),'[]'::jsonb) FROM ${table} t)`;

export function buildSourceSnapshotQuery(tableNames, { includeSchema = false } = {}) {
  if (!Array.isArray(tableNames) || !tableNames.length || tableNames.length > 256 ||
      tableNames.some(name => typeof name !== "string" || !namePattern.test(name)) ||
      new Set(tableNames).size !== tableNames.length) {
    throw new Error("A verified, unique public-table inventory is required.");
  }
  const tables = [...tableNames].sort();
  const schema = includeSchema ? `,
    'schema',jsonb_build_object(
      'constraints',${rows("(SELECT c.relname AS table_name,p.conname AS name,p.contype AS type,pg_get_constraintdef(p.oid,true) AS definition FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public')")},
      'indexes',${rows("(SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_indexes WHERE schemaname='public')")},
      'functions',${rows("(SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition,p.prosecdef AS security_definer,p.proconfig AS settings FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p'))")},
      'triggers',${rows("(SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid,true) AS definition,t.tgenabled AS enabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal)")},
      'views',${rows("(SELECT viewname AS name,definition FROM pg_views WHERE schemaname='public')")},
      'policies',${rows("(SELECT tablename AS table_name,policyname AS name,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public')")},
      'enums',${rows("(SELECT t.typname AS name,e.enumlabel AS label,e.enumsortorder AS ordering FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public')")},
      'sequences',${rows("(SELECT sequencename AS name,data_type::text,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname='public')")},
      'extensions',${rows("(SELECT e.extname AS name,e.extversion AS version,n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace)")}
    )` : "";
  const query = `SELECT jsonb_build_object(
    'format','merotalent-source-recovery-snapshot-v1',
    'sourceProject','${sourceProject}',
    'database',current_database(), 'role',current_user,
    'transactionReadOnly',current_setting('transaction_read_only'),
    'statementTimestamp',statement_timestamp(), 'mvccSnapshot',pg_current_snapshot()::text,
    'publicTableNames',(SELECT jsonb_agg(table_name ORDER BY table_name)
      FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
    'publicColumns',${rows("(SELECT table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default,is_identity,identity_generation,identity_start,identity_increment,identity_minimum,identity_maximum,identity_cycle,is_generated,generation_expression FROM information_schema.columns WHERE table_schema='public')")},
    'public',(SELECT jsonb_object_agg(table_name,table_rows) FROM (
      ${tables.map(name => `SELECT '${name}'::text AS table_name,${rows(`public.${quote(name)}`)} AS table_rows`).join(" UNION ALL ")}
    ) inventory),
    'auth',jsonb_build_object(
      'users',${rows("(SELECT id,email,email_confirmed_at,phone,phone_confirmed_at,created_at,updated_at,last_sign_in_at,banned_until,deleted_at,raw_app_meta_data,raw_user_meta_data,COALESCE(encrypted_password,'')<>'' AS has_password FROM auth.users)")},
      'identities',${rows("(SELECT id,user_id,provider,provider_id,created_at,updated_at,last_sign_in_at FROM auth.identities)")},
      'omittedSecrets',jsonb_build_array('password_hashes','confirmation_tokens','recovery_tokens','oauth_tokens','session_tokens')),
    'storage',jsonb_build_object('buckets',${rows("storage.buckets")},'objects',${rows("storage.objects")})${schema}
  ) AS snapshot`;
  assertInventorySelect(query);
  return query;
}

export function validateSourceSnapshot(snapshot, expectedTables) {
  const expected = [...expectedTables].sort();
  if (!snapshot || snapshot.format !== "merotalent-source-recovery-snapshot-v1" ||
      snapshot.sourceProject !== sourceProject || snapshot.database !== "postgres" ||
      snapshot.role !== "supabase_read_only_user" || snapshot.transactionReadOnly !== "on" ||
      typeof snapshot.mvccSnapshot !== "string" || !/^\d+:\d+:[\d,]*$/.test(snapshot.mvccSnapshot) ||
      !Number.isFinite(Date.parse(snapshot.statementTimestamp)) ||
      JSON.stringify(snapshot.publicTableNames) !== JSON.stringify(expected) ||
      JSON.stringify(Object.keys(snapshot.public ?? {}).sort()) !== JSON.stringify(expected)) {
    throw new Error("Source identity, read-only state, or snapshot table coverage could not be verified.");
  }
  for (const values of [...Object.values(snapshot.public), snapshot.publicColumns,
    snapshot.auth?.users, snapshot.auth?.identities, snapshot.storage?.buckets, snapshot.storage?.objects,
    ...Object.values(snapshot.schema ?? {})]) {
    if (!Array.isArray(values) || values.some(row => typeof row !== "string" || !row.startsWith("{"))) {
      throw new Error("The source returned an incomplete row snapshot.");
    }
    // PostgreSQL serializes every row to text before the API response. Keep
    // that exact text so JS cannot round bigint/numeric values or microseconds.
    for (const row of values) JSON.parse(row);
  }
  return snapshot;
}

function keyBytes(value) {
  const key = Buffer.from(value ?? "", "base64");
  if (key.length !== 32 || key.toString("base64") !== value) throw new Error("A valid snapshot encryption key is required.");
  return key;
}

export function encryptSourceSnapshot(snapshot, keyValue) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(keyValue), iv);
  const aad = Buffer.from("merotalent-source-recovery-snapshot-v1");
  cipher.setAAD(aad);
  const data = Buffer.concat([cipher.update(JSON.stringify(snapshot)), cipher.final()]);
  return JSON.stringify({ format: "merotalent-source-encrypted-snapshot-v1", algorithm: "AES-256-GCM",
    iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: data.toString("base64") });
}

export function decryptSourceSnapshot(envelopeText, keyValue) {
  const envelope = JSON.parse(envelopeText);
  if (envelope.format !== "merotalent-source-encrypted-snapshot-v1" || envelope.algorithm !== "AES-256-GCM") {
    throw new Error("Unsupported encrypted source snapshot.");
  }
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(keyValue), Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from("merotalent-source-recovery-snapshot-v1"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}

export function summarizeSourceSnapshot(snapshot) {
  const users = snapshot.auth.users.map(row => JSON.parse(row));
  const identities = snapshot.auth.identities.map(row => JSON.parse(row));
  const ids = new Set(users.map(user => user.id));
  const providerCounts = {};
  for (const identity of identities) providerCounts[identity.provider] = (providerCounts[identity.provider] ?? 0) + 1;
  return { sourceProject, role: snapshot.role, transactionReadOnly: snapshot.transactionReadOnly,
    statementTimestamp: snapshot.statementTimestamp, mvccSnapshot: snapshot.mvccSnapshot,
    publicTables: Object.keys(snapshot.public).length,
    publicRows: Object.values(snapshot.public).reduce((sum, values) => sum + values.length, 0),
    sourceAuthUsers: users.length, sourceAuthIdentities: identities.length, providers: providerCounts,
    verifiedEmails: users.filter(user => user.email_confirmed_at).length,
    passwordCredentialsPresent: users.filter(user => user.has_password).length,
    bannedOrDeletedUsers: users.filter(user => user.deleted_at || (user.banned_until && Date.parse(user.banned_until) > Date.now())).length,
    orphanIdentities: identities.filter(identity => !ids.has(identity.user_id)).length,
    storageBuckets: snapshot.storage.buckets.length, storageObjects: snapshot.storage.objects.length,
    schemaCatalogIncluded: !!snapshot.schema,
    ...(snapshot.schema ? { schemaCatalogCounts: Object.fromEntries(Object.entries(snapshot.schema).map(([name, records]) => [name, records.length])) } : {}),
    snapshotSha256: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
    rawAuthSecretsExported: false, authImportSupported: false,
    consistency: "All data comes from one PostgreSQL SELECT statement snapshot; writes after extraction require a final delta" };
}
