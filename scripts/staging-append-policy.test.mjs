import { test } from "node:test";
import assert from "node:assert/strict";
import { appendTriggerUnsafe, appendColumnUnsafe, assertAppendOnly, assertExistingRowsUnchanged } from "./staging-append-policy.mjs";
test("append preserves UPDATE/DELETE guards but rejects every INSERT trigger", () => {
  assert.equal(appendTriggerUnsafe({ type: 19 }), false);
  assert.equal(appendTriggerUnsafe({ type: 27 }), false);
  assert.equal(appendTriggerUnsafe({ type: 7 }), true);
  assert.equal(appendTriggerUnsafe({ type: 23 }), true);
});
test("only reviewed nonprivileged literal extra default is permitted", () => {
  const c = { table_name: "profiles", column_name: "job_preferences", column_default: "'{}'::jsonb", is_generated: "NEVER", is_identity: "NO" };
  assert.equal(appendColumnUnsafe(c, ["id"]), false);
  for (const variant of [{ column_name: "role" }, { column_default: "nextval('seq')" }, { column_default: "now()" }, { is_identity: "YES" }, { is_generated: "ALWAYS" }])
    assert.equal(appendColumnUnsafe({ ...c, ...variant }, ["id"]), true);
});
test("rejects updates and detects modification or removal of any retained full row", () => {
  assert.doesNotThrow(() => assertAppendOnly([{ operations: [{ kind: "insert" }], conflicts: [{}] }]));
  assert.throws(() => assertAppendOnly([{ operations: [{ kind: "update" }] }]), /REJECTS_UPDATES/);
  const before = ['{"id":1,"extra":"retained","timestamp":"2026-10-19T00:00:00.123456Z"}'];
  assert.doesNotThrow(() => assertExistingRowsUnchanged(before, [...before, '{"id":2}'], ["id"]));
  assert.throws(() => assertExistingRowsUnchanged(before, [], ["id"]), /CHANGED_OR_DELETED/);
  assert.throws(() => assertExistingRowsUnchanged(before, ['{"id":1,"extra":"changed"}'], ["id"]), /CHANGED_OR_DELETED/);
});
