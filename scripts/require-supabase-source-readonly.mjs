const PROJECT_REF = "dtirpilgzlsfryucanlg";

/** Reject administrator/direct connections before a socket is opened. */
export function parseReadOnlySourceConfig(value, expectedHost, expectedRole) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid read-only source URL."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !expectedHost || !expectedRole
    || !/^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(expectedHost)
    || url.hostname !== expectedHost
    || url.port !== "5432"
    || decodeURIComponent(url.pathname) !== "/postgres") {
    throw new Error("Refusing source connection: exact IPv4 session-pooler identity is not configured.");
  }
  const username = decodeURIComponent(url.username);
  if (username !== `${expectedRole}.${PROJECT_REF}` || expectedRole === "postgres"
    || !url.password || url.searchParams.has("sslmode") || url.searchParams.has("ssl")) {
    throw new Error("Refusing source connection: expected dedicated read-only role and TLS are required.");
  }
  return {
    host: url.hostname,
    port: 5432,
    database: "postgres",
    user: username,
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
    application_name: "merotalent-readonly-reconciliation",
  };
}

/** Call only after BEGIN READ ONLY; this is intentionally stricter than that transaction flag. */
export async function verifyReadOnlySource(client, expectedRole) {
  const result = await client.query(`
    SELECT current_database() AS database_name,
      current_user AS role_name,
      current_setting('transaction_read_only') AS transaction_read_only,
      r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls,
      has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_database_objects,
      EXISTS (
        SELECT 1 FROM pg_namespace n
        WHERE n.nspname IN ('auth', 'public', 'storage')
          AND has_schema_privilege(current_user, n.oid, 'CREATE')
      ) AS can_create_schema_objects,
      EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('auth', 'public', 'storage')
          AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
          AND (has_table_privilege(current_user, c.oid, 'INSERT')
            OR has_table_privilege(current_user, c.oid, 'UPDATE')
            OR has_table_privilege(current_user, c.oid, 'DELETE')
            OR has_table_privilege(current_user, c.oid, 'TRUNCATE'))
      ) AS can_mutate_tables,
      EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('auth', 'public', 'storage') AND c.relkind = 'S'
          AND (has_sequence_privilege(current_user, c.oid, 'UPDATE')
            OR has_sequence_privilege(current_user, c.oid, 'USAGE'))
      ) AS can_mutate_sequences,
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname IN ('auth', 'public', 'storage') AND p.prosecdef
          AND has_function_privilege(current_user, p.oid, 'EXECUTE')
      ) AS can_execute_security_definer,
      EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','auth','storage') AND c.relkind IN ('r','p')
          AND NOT has_table_privilege(current_user,c.oid,'SELECT')
      ) AS missing_table_select,
      EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','auth','storage') AND c.relkind IN ('r','p') AND c.relrowsecurity
          AND (NOT EXISTS (
            SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polcmd IN ('r','*') AND p.polpermissive
              AND (0=ANY(p.polroles) OR EXISTS (SELECT 1 FROM pg_roles pr WHERE pr.oid=ANY(p.polroles)
                AND pg_has_role(current_user,pr.oid,'USAGE')))
              AND (p.polqual IS NULL OR pg_get_expr(p.polqual,p.polrelid)='true')
          ) OR EXISTS (
            SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polcmd IN ('r','*') AND NOT p.polpermissive
              AND (0=ANY(p.polroles) OR EXISTS (SELECT 1 FROM pg_roles pr WHERE pr.oid=ANY(p.polroles)
                AND pg_has_role(current_user,pr.oid,'USAGE')))
              AND p.polqual IS NOT NULL AND pg_get_expr(p.polqual,p.polrelid)<>'true'
          ))
      ) AS row_filter_unverified,
      to_regclass('auth.users') IS NOT NULL AS users_exist,
      to_regclass('auth.identities') IS NOT NULL AS identities_exist,
      (has_column_privilege(current_user, 'auth.users', 'id', 'SELECT')
        AND has_column_privilege(current_user, 'auth.users', 'email', 'SELECT')
        AND has_column_privilege(current_user, 'auth.users', 'email_confirmed_at', 'SELECT')
        AND has_column_privilege(current_user, 'auth.users', 'encrypted_password', 'SELECT')) AS can_read_users,
      (has_column_privilege(current_user, 'auth.identities', 'user_id', 'SELECT')
        AND has_column_privilege(current_user, 'auth.identities', 'provider', 'SELECT')
        AND has_column_privilege(current_user, 'auth.identities', 'provider_id', 'SELECT')) AS can_read_identities
    FROM pg_roles r WHERE r.rolname = current_user`);
  const row = result.rows[0];
  if (!row || row.database_name !== "postgres" || row.role_name !== expectedRole
    || row.transaction_read_only !== "on" || row.rolsuper || row.rolcreatedb
    || row.rolcreaterole || row.rolreplication || row.rolbypassrls
    || row.can_create_database_objects || row.can_create_schema_objects || row.can_mutate_tables
    || row.can_mutate_sequences || row.can_execute_security_definer
    || row.missing_table_select !== false || row.row_filter_unverified !== false
    || !row.users_exist || !row.identities_exist || !row.can_read_users || !row.can_read_identities) {
    throw new Error("Refusing source inventory: project role or read-only privileges could not be verified.");
  }
}
