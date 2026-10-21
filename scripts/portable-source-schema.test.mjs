import { test } from "node:test";
import assert from "node:assert/strict";
import { portableSourceSchema, rehearsePortableSchema, applyPortableCandidateSchema } from "./portable-source-schema.mjs";
test("incomplete reviewed source schema is rejected", () => {
  assert.throws(() => portableSourceSchema({ schema: { functions: [] } }), /REVIEWED_PORTABLE_FUNCTION_SET_REQUIRED/);
});
const targetUrl = "postgresql://fixture:fixture@ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb";
test("candidate requires exact target and both integrity hooks", async () => {
  const client = { connectionParameters: { host: "localhost", database: "neondb" } };
  await assert.rejects(applyPortableCandidateSchema(client, {}, { targetUrl, before: async()=>{}, verify: async()=>{} }), /VERIFIED_CANDIDATE_REQUIRED/);
});
test("candidate rolls back when its integrity check fails", async () => {
  const calls = [];
  const client = { connectionParameters: { host: new URL(targetUrl).hostname, database: "neondb" },
    query: async sql => { calls.push(sql); return { rows: [], rowCount: 0 }; } };
  await assert.rejects(applyPortableCandidateSchema(client,
    { functions: [], triggers: [], views: [], indexes: [], checks: [] },
    { targetUrl, before: async()=>{}, verify: async()=>{ throw new Error("ROW_CHANGED"); } }), /ROW_CHANGED/);
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.ok(!calls.includes("COMMIT"));
});
test("remote production and staging connections cannot execute the local rehearsal", async () => {
  for (const host of ["ep-polished-flower-azsezy8a.neon.tech", "localhost", "/tmp/arbitrary", "/private/tmp/mt-restore-X/../other"]) {
    await assert.rejects(rehearsePortableSchema({ connectionParameters: { host, database: "postgres" } }, {}), /PRIVATE_LOCAL_RESTORE_REQUIRED/);
  }
});
