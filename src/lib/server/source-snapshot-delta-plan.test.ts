import { describe, expect, it } from "vitest";
import { planSourceSnapshotDelta, sourceSnapshotPrimaryKeys } from "../../../scripts/plan-source-snapshot-delta.mjs";

const snapshot = (time: string, rows: string[], constraints = ['{"table_name":"records","type":"p","definition":"PRIMARY KEY (id)"}']) => ({
  format: "merotalent-source-recovery-snapshot-v1", sourceProject: "dtirpilgzlsfryucanlg", database: "postgres",
  role: "supabase_read_only_user", transactionReadOnly: "on", statementTimestamp: time, mvccSnapshot: "1:1:",
  publicTableNames: ["records"], public: { records: rows }, publicColumns: [],
  auth: { users: [], identities: [] }, storage: { buckets: [], objects: [] }, schema: { constraints },
});

describe("source final-delta plan", () => {
  it("reports microsecond changes instead of rounding timestamps through JavaScript Date",()=>{
    const baseline=snapshot("2026-10-17T10:00:00Z",['{"id":"a","at":"2026-10-17T00:00:00.123001Z"}']);
    const final=snapshot("2026-10-17T10:01:00Z",['{"id":"a","at":"2026-10-17T00:00:00.123002Z"}']);
    expect(planSourceSnapshotDelta(baseline,final).expectedUpdates).toBe(1);
  });
  it("reports inserts, exact numeric updates and deletions without exposing source values", () => {
    const baseline = snapshot("2026-10-17T10:00:00Z", ['{"id":"a","amount":100.00}', '{"id":"b","amount":1}']);
    const final = snapshot("2026-10-17T10:05:00Z", ['{"id":"a","amount":1e2}', '{"id":"c","amount":9007199254740993}']);
    const plan = planSourceSnapshotDelta(baseline, final);
    expect(plan.expectedInserts).toBe(1); expect(plan.expectedUpdates).toBe(0); expect(plan.expectedDeletes).toBe(1);
    expect(plan.targetWrites).toBe(0); expect(JSON.stringify(plan)).not.toContain("9007199254740993");
    expect(plan.targetConflictAnalysis).toMatchObject({ status: "REQUIRES_SEPARATE_TARGET_RECONCILIATION", inspected: false });
  });
  it("detects true updates and preserves composite primary-key identity", () => {
    const constraints = ['{"table_name":"records","type":"p","definition":"PRIMARY KEY (id, module)"}'];
    const baseline = snapshot("2026-10-17T10:00:00Z", ['{"id":"a","module":"jobs","amount":1}', '{"id":"a","module":"college","amount":1}'], constraints);
    const final = snapshot("2026-10-17T10:01:00Z", ['{"id":"a","module":"jobs","amount":2}', '{"id":"a","module":"college","amount":1}'], constraints);
    const plan = planSourceSnapshotDelta(baseline, final);
    expect(plan.tables[0].expectedUpdates).toHaveLength(1);
    expect(sourceSnapshotPrimaryKeys(final).get("records")).toEqual(["id", "module"]);
  });
  it("fails closed when final schema keys or table lineage are insufficient", () => {
    const baseline = snapshot("2026-10-17T10:00:00Z", ['{"id":"a","amount":1}']);
    const noKey = snapshot("2026-10-17T10:01:00Z", ['{"id":"a","amount":1}'], []);
    const blocked = planSourceSnapshotDelta(baseline, noKey);
    expect(blocked.readyForOperatorReview).toBe(false);
    expect(blocked.blockedTables).toEqual(["records"]);
    expect(() => planSourceSnapshotDelta({ ...baseline, sourceProject: "wrong" }, snapshot("2026-10-17T10:01:00Z", []) )).toThrow("SOURCE_SNAPSHOT_LINEAGE_INVALID");
  });
});
