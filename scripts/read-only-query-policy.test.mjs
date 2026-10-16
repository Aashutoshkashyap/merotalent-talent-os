import { test } from "node:test";
import assert from "node:assert/strict";
import { assertInventorySelect } from "./read-only-query-policy.mjs";

test("source inventory accepts one bounded SELECT", () => {
  assert.doesNotThrow(() => assertInventorySelect("SELECT count(*) FROM auth.users"));
});

test("source inventory rejects writes and multi-statements", () => {
  for (const query of ["DELETE FROM auth.users", "SELECT 1; DELETE FROM auth.users",
    "SELECT 1 -- bypass", "SELECT 1 /* bypass */", "SELECT * INTO temp_copy FROM auth.users",
    "SELECT * FROM auth.users FOR UPDATE"]) {
    assert.throws(() => assertInventorySelect(query));
  }
});
