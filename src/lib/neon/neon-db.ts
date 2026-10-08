/**
 * Retired contract stub. Do not treat `SET LOCAL` alone as an RLS guarantee:
 * the connection role, policies, and verified auth identity must all agree.
 * The real staging database client is in `src/lib/server/db.ts` and remains
 * unapproved for user-scoped production traffic until adversarial RLS tests pass.
 */

export interface NeonQueryContext {
  userId?: string | null;
  role?: string | null;
  isServiceRole?: boolean;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export class NeonDatabaseClient {
  constructor(_databaseUrl?: string) {}

  /**
   * Executes a query in the context of an authenticated user with transaction isolation.
   * `SET LOCAL` guarantees zero pool contamination across concurrent requests.
   */
  async executeUserQuery<T = any>(
    _context: NeonQueryContext,
    _sql: string,
    _params: any[] = []
  ): Promise<QueryResult<T>> {
    throw new Error("Neon user-scoped database queries are not enabled; RLS parity is unverified.");
  }

  /**
   * Transactional helper that runs a callback with an isolated transaction client.
   */
  async withTransaction<T>(
    _context: NeonQueryContext,
    _callback: (client: NeonDatabaseClient) => Promise<T>
  ): Promise<T> {
    throw new Error("Neon transactions are not enabled through this contract stub.");
  }
}

export const neonDb = new NeonDatabaseClient();
