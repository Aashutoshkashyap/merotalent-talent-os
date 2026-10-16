import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildSourceSnapshotQuery, decryptSourceSnapshot, encryptSourceSnapshot,
  summarizeSourceSnapshot, validateSourceSnapshot } from "../../../scripts/source-auth-snapshot.mjs";

const snapshot = {
  format: "merotalent-source-recovery-snapshot-v1", sourceProject: "dtirpilgzlsfryucanlg",
  database: "postgres", role: "supabase_read_only_user", transactionReadOnly: "on",
  statementTimestamp: "2026-10-14T00:00:00Z", mvccSnapshot: "100:101:", publicTableNames: ["profiles"],
  publicColumns: ['{"table_name":"profiles"}'], public: { profiles: ['{"n":9007199254740993,"timestamp":"2026-10-14T00:00:00.123456Z"}'] },
  auth: { users: ['{"id":"legacy-id","email":"private@example.test","has_password":true}'],
    identities: ['{"user_id":"legacy-id","provider":"google","provider_id":"private-provider-id"}'] },
  storage: { buckets: [], objects: [] },
};

describe("consistent read-only source recovery snapshot", () => {
  it("captures public rows, auth identity subjects, and storage together in one SELECT", () => {
    const sql = buildSourceSnapshotQuery(["profiles", "user_roles"]);
    expect(sql.trim().startsWith("SELECT")).toBe(true);
    expect(sql).not.toMatch(/;|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bCREATE\b|\bGRANT\b/i);
    expect(sql).toContain("FROM auth.users");
    expect(sql).toContain("FROM auth.identities");
    expect(sql).toContain("provider_id");
    expect(sql).toContain("FROM storage.objects");
    expect(sql).toContain("pg_current_snapshot()");
    expect(sql).not.toContain("identity_data");
    expect(sql).not.toMatch(/SELECT[^\n]*\brecovery_token\b/);
    expect(sql).toContain("has_password");
    expect(sql).toContain("to_jsonb(t)::text");
  });

  it("rejects injection, duplicate inventory, unexpected role and table drift", () => {
    expect(() => buildSourceSnapshotQuery(["profiles;DROP TABLE"])).toThrow();
    expect(() => buildSourceSnapshotQuery(["profiles", "profiles"])).toThrow();
    expect(() => validateSourceSnapshot({ ...snapshot, role: "postgres" }, ["profiles"])).toThrow();
    expect(() => validateSourceSnapshot({ ...snapshot, transactionReadOnly: "off" }, ["profiles"])).toThrow();
    expect(() => validateSourceSnapshot({ ...snapshot, publicTableNames: ["profiles", "new_table"] }, ["profiles"])).toThrow();
    expect(validateSourceSnapshot(snapshot, ["profiles"])).toBe(snapshot);
  });

  it("encrypts sensitive identities and preserves exact bigint/timestamp text on authenticated readback", () => {
    const key = randomBytes(32).toString("base64");
    const encrypted = encryptSourceSnapshot(snapshot, key);
    expect(encrypted).not.toContain("private@example.test");
    expect(encrypted).not.toContain("private-provider-id");
    expect(decryptSourceSnapshot(encrypted, key)).toEqual(snapshot);
    const changed = JSON.parse(encrypted);
    changed.ciphertext = randomBytes(64).toString("base64");
    expect(() => decryptSourceSnapshot(JSON.stringify(changed), key)).toThrow();
    expect(() => decryptSourceSnapshot(encrypted, randomBytes(32).toString("base64"))).toThrow();
  });

  it("returns counts and digest without personal identifiers or credentials", () => {
    const summary = summarizeSourceSnapshot(snapshot);
    expect(summary).toMatchObject({ sourceAuthUsers: 1, sourceAuthIdentities: 1,
      providers: { google: 1 }, publicTables: 1, orphanIdentities: 0 });
    expect(JSON.stringify(summary)).not.toMatch(/private@|private-provider|legacy-id/);
  });
  it("can preserve schema catalog and generated-column metadata in the same read-only encrypted snapshot", () => {
    const sql = buildSourceSnapshotQuery(["profiles"], { includeSchema: true });
    expect(sql.trim().startsWith("SELECT")).toBe(true);
    expect(sql).not.toMatch(/;|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bCREATE\b|\bGRANT\b/i);
    expect(sql).toContain("pg_get_functiondef");
    expect(sql).toContain("pg_get_triggerdef");
    expect(sql).toContain("identity_generation");
    const schemaSnapshot = { ...snapshot, schema: { functions: ['{"definition":"private schema definition"}'], constraints: [] } };
    expect(validateSourceSnapshot(schemaSnapshot, ["profiles"])).toBe(schemaSnapshot);
    const key = randomBytes(32).toString("base64");
    const encrypted = encryptSourceSnapshot(schemaSnapshot, key);
    expect(encrypted).not.toContain("private schema definition");
    expect(summarizeSourceSnapshot(schemaSnapshot)).toMatchObject({ schemaCatalogIncluded: true, schemaCatalogCounts: { functions: 1, constraints: 0 } });
  });
});
