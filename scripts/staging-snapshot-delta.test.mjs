import { test } from "node:test";
import assert from "node:assert/strict";
import { planTableDelta, opaqueDelta, dependencyOrder,exactTimestampInstant } from "./staging-snapshot-delta.mjs";
const make = (baseline, final, target) => planTableDelta({ table: "fixture", baseline, final, target, keys: ["id"], columns: ["id", "value"] });
test("typed timestamp comparison normalizes offsets but never discards microseconds or rewrites text fields",()=>{
  const utc="2026-10-17T00:00:00.123456+00:00",local="2026-10-17T05:45:00.123456+05:45";
  assert.equal(exactTimestampInstant(utc),exactTimestampInstant(local));
  assert.notEqual(exactTimestampInstant(utc),exactTimestampInstant(utc.replace("123456","123000")));
  const a=JSON.stringify({id:1,value:utc}),b=JSON.stringify({id:1,value:local});
  assert.equal(planTableDelta({table:"fixture",baseline:[a],final:[a],target:[b],keys:["id"],columns:["id","value"],timestampColumns:["value"]}).conflicts.length,0);
  assert.equal(make([a],[a],[b]).conflicts.length,1);
});
test("three-way replay inserts new rows, updates unchanged baseline, and preserves target-only fixtures", () => {
  const result = make(['{"id":1,"value":"old"}'], ['{"id":1,"value":"new"}', '{"id":2,"value":null}'], ['{"id":1,"value":"old"}', '{"id":3,"value":"synthetic"}']);
  assert.deepEqual(result.operations.map(o => o.kind), ["update", "insert"]);
  assert.equal(result.targetOnly.length, 1);
  assert.equal(result.conflicts.length, 0);
  assert.ok(!JSON.stringify(opaqueDelta(result)).includes("synthetic"));
  assert.ok(!JSON.stringify(opaqueDelta(result)).includes('"raw"'));
  const changedFixture = make([], [], ['{"id":3,"value":"changed"}']);
  const originalFixture = make([], [], ['{"id":3,"value":"synthetic"}']);
  assert.deepEqual(changedFixture.targetOnly, originalFixture.targetOnly);
  assert.notEqual(changedFixture.targetOnlyFingerprint, originalFixture.targetOnlyFingerprint);
});
test("replay is idempotent; source deletion and independent target edits fail closed", () => {
  assert.equal(make([], ['{"id":1,"value":2}'], ['{"id":1,"value":2}']).operations.length, 0);
  assert.equal(make(['{"id":1,"value":1}'], [], ['{"id":1,"value":1}']).conflicts[0].reason, "SOURCE_DELETE_REQUIRES_APPROVED_POLICY");
  assert.equal(make(['{"id":1,"value":1}'], ['{"id":1,"value":2}'], ['{"id":1,"value":3}']).conflicts[0].reason, "INDEPENDENT_TARGET_CHANGE");
});
test("preserves exact numbers and microseconds and refuses silently repairing missing baseline rows", () => {
  const old = '{"id":1,"value":9007199254740992}';
  const next = '{"id":1,"value":9007199254740993}';
  assert.equal(make([old], [next], [old]).operations[0].raw, next);
  const a = '{"id":1,"value":"2026-10-17T00:00:00.123001+00:00"}';
  const b = '{"id":1,"value":"2026-10-17T00:00:00.123002+00:00"}';
  assert.equal(make([a], [b], [a]).operations.length, 1);
  assert.equal(make([a], [a], []).conflicts.length, 1);
});
test("duplicate keys, missing values, cycles and self-references are explicit failures", () => {
  assert.throws(() => make([], ['{"id":1,"value":null}', '{"id":1,"value":null}'], []), /DUPLICATE/);
  assert.throws(() => make([], ['{"id":1}'], []), /INCOMPLETE/);
  assert.deepEqual(dependencyOrder(["child", "parent"], [{ child: "child", parent: "parent" }]), ["parent", "child"]);
  assert.throws(() => dependencyOrder(["a"], [{ child: "a", parent: "a" }]), /CYCLIC/);
});
