import {test}from"node:test";
import assert from"node:assert/strict";
import {compareSchemaRows}from"./staging-schema-evidence.mjs";
test("schema counts alone cannot hide changed definitions or missing authorization policies",()=>{
  const r=compareSchemaRows([{name:"a",definition:"source"},{name:"policy"}],[{name:"a",definition:"changed"},{name:"fixture"}]);
  assert.equal(r.sourceCount,r.targetCount);assert.equal(r.exact,0);
  assert.deepEqual(r.entries.map(e=>e.status),["DEFINITION_DIFFERS","TARGET_ONLY","SOURCE_ONLY"]);
  assert.ok(!JSON.stringify(r).includes('"definition"'));
});
