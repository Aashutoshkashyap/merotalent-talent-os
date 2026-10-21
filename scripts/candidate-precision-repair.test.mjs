import { test } from "node:test";
import assert from "node:assert/strict";
import { rehearseCandidatePrecision, runCandidatePrecision } from "./candidate-precision-repair.mjs";
test("precision restore rehearsal cannot write a remote candidate", async () => {
  await assert.rejects(rehearseCandidatePrecision({connectionParameters:{host:'production.neon.tech',database:'neondb'}},{},{}),/PRIVATE_LOCAL_RESTORE_REQUIRED/);
});
test("candidate precision mutation requires a successful restore rehearsal", async () => {
  const url='postgresql://fixture:fixture@ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb';
  const client={connectionParameters:{host:new URL(url).hostname,database:'neondb'}};
  await assert.rejects(runCandidatePrecision(client,{},{},{targetUrl:url,mode:'apply-candidate'}),/PRECISION_RESTORE_REHEARSAL_REQUIRED/);
  await assert.rejects(runCandidatePrecision(client,{},{},{targetUrl:url,mode:'apply-staging'}),/VERIFIED_CANDIDATE_REQUIRED/);
});
