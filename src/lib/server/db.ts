/**
 * Isolated Neon staging PostgreSQL access. Callers supply parameterized SQL;
 * this module never returns a connection string or database client to browsers.
 * Authorization belongs in the repository/service layer, not in this pool.
 */
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getNeonDatabaseConfig } from "@/lib/neon/neon-config";

export class NeonDatabaseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "NeonDatabaseError";
  }
}

let pool: Pool | undefined;
let poolTarget: string | undefined;

export function getPool(): Pool {
  if (typeof window !== "undefined") {
    throw new NeonDatabaseError("Database connections are server-only.");
  }
  const { databaseUrl } = getNeonDatabaseConfig();
  if (pool && poolTarget !== databaseUrl) {
    throw new NeonDatabaseError("The Neon staging target changed during this process.");
  }
  if (!pool) {
    // The staging URL must be a pooled Neon endpoint. Keep a small per-instance
    // pool to avoid multiplying Postgres connections across Vercel functions.
    if (!new URL(databaseUrl).hostname.includes("-pooler.")) {
      throw new NeonDatabaseError("Use the pooled Neon staging connection URL.");
    }
    pool = new Pool({
      connectionString: databaseUrl,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    poolTarget = databaseUrl;
  }
  return pool;
}

export async function queryRows<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  try {
    const result = await getPool().query<T>(text, [...values]);
    return result.rows;
  } catch (cause) {
    if (cause instanceof NeonDatabaseError) throw cause;
    throw new NeonDatabaseError("Neon staging query failed.", cause);
  }
}

/** Commit only after every authorization and write in the callback succeeds. */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await callback(client);
    await client.query("COMMIT");
    return value;
  } catch (cause) {
    await client.query("ROLLBACK");
    // Authorization errors are application decisions, not database outages.
    // Avoid importing neon-authorization here: that module uses queryRows.
    if (cause instanceof Error &&
        (cause instanceof NeonDatabaseError || cause.name === "NeonAuthorizationError")) {
      throw cause;
    }
    throw new NeonDatabaseError("Neon staging transaction failed.", cause);
  } finally {
    client.release();
  }
}

/**
 * The copied tables do not have working Neon user-context RLS. Never pretend
 * that setting a session variable alone enforces the old Supabase policies.
 */
export async function withUserContext<T>(
  _userId: string,
  _callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  throw new NeonDatabaseError(
    "Neon user-context RLS is unavailable; use an authorized repository operation.",
  );
}
