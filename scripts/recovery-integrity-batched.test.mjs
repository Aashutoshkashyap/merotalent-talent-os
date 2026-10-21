import { test } from "node:test";
import assert from "node:assert/strict";
import { tableFingerprintsBatched, sha256 } from "./recovery-integrity.mjs";
test("batched fingerprints preserve empty tables and lossless database JSON", async () => {
  let calls = 0;
  const raw = '{"id": 9007199254740993, "time": "2026-10-20T00:00:00.123456+00:00"}';
  const result = await tableFingerprintsBatched({ query: async () => ({ rows: ++calls === 1
    ? [{ schema: "public", name: "empty" }, { schema: "public", name: "profiles" }]
    : [{ schema: "public", name: "profiles", row: raw }] }) });
  assert.deepEqual(result, [{ schema: "public", name: "empty", count: 0, hash: sha256("") },
    { schema: "public", name: "profiles", count: 1, hash: sha256(raw) }]);
  assert.equal(calls, 2);
});
test("unexpected identifiers are rejected before constructing SQL", async () => {
  await assert.rejects(tableFingerprintsBatched({ query: async () => ({ rows: [{ schema: "public", name: "unsafe'name" }] }) }), /UNEXPECTED_RECOVERY_TABLE_NAME/);
});
test("forward-column rehearsal compares every original field without accepting removed columns", async () => {
  let calls = 0, generated = "";
  const c = { query: async sql => {
    calls++;
    if (calls === 1) return { rows: [{ schema: "public", name: "profiles" }, { schema: "public", name: "new_ledger" }] };
    if (calls === 2) return { rows: ["id", "job_preferences"].map(column_name => ({ table_schema: "public", table_name: "profiles", column_name })) };
    generated = sql; return { rows: [{ schema: "public", name: "profiles", row: '{"id": 1}' }] };
  } };
  const result = await tableFingerprintsBatched(c, { baselineColumns: { "public.profiles": ["id"] } });
  assert.deepEqual(result, [{ schema: "public", name: "profiles", count: 1, hash: sha256('{"id": 1}') }]);
  assert.ok(generated.includes("ARRAY['job_preferences']::text[]"));
  assert.ok(!generated.includes('FROM "public"."new_ledger"'));
  let step = 0;
  await assert.rejects(tableFingerprintsBatched({ query: async () => ({ rows: ++step === 1
    ? [{ schema: "public", name: "profiles" }] : [] }) }, { baselineColumns: { "public.profiles": ["id"] } }), /RECOVERY_COLUMN_REMOVED/);
});
