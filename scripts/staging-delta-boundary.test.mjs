import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const script="scripts/apply-source-snapshot-staging.mjs";
test("the CLI refuses production/unknown targets before snapshot or database access",()=>{
  for(const target of ["production","br-falling-breeze-azr6q64l","migration-staging"]) {
    const result=spawnSync(process.execPath,[script,`--target=${target}`],{encoding:"utf8"});
    assert.equal(result.status,1);
    assert.equal(JSON.parse(result.stderr).code,"EXPLICIT_STAGING_TARGET_AND_MODE_REQUIRED");
  }
});
test("the CLI requires pinned snapshot hashes and refuses a production execution environment",()=>{
  const base=["--target=br-frosty-haze-azsnybmr","--mode=dry-run"];
  let result=spawnSync(process.execPath,[script,...base],{encoding:"utf8"});
  assert.equal(JSON.parse(result.stderr).code,"EXPECTED_SNAPSHOT_HASHES_REQUIRED");
  result=spawnSync(process.execPath,[script,...base,`--baseline-sha256=${"a".repeat(64)}`,`--final-sha256=${"b".repeat(64)}`],{encoding:"utf8",env:{...process.env,VERCEL_ENV:"production"}});
  assert.equal(result.status,1);assert.equal(JSON.parse(result.stderr).code,"PRODUCTION_OR_UNVERIFIED_ENVIRONMENT_DENIED");
});
