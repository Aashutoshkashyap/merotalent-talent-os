import { test } from "node:test";
import assert from "node:assert/strict";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
const base = "postgresql://fixture:fixture@ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb";
test("production backup target pins compute, database, port and certificate validation", () => {
  assert.equal(productionCandidateUrl(base).searchParams.get("sslmode"), "verify-full");
  for (const input of [base.replace("polished-flower-azsezy8a", "wispy-credit-azt6tgwj"),
    base.replace("/neondb", "/postgres"), `${base}?host=attacker.test`, `${base}?options=-crole=admin`,
    `${base}?uselibpqcompat=true`, base.replace("/neondb", ":6543/neondb"), `${base}#secret`]) {
    assert.throws(() => productionCandidateUrl(input), /UNREVIEWED/);
  }
});
