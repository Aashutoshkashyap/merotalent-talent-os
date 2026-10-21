import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { rehearseRuntimeFoundation } from "./runtime-foundation-rehearsal.mjs";
test("runtime schema rehearsal rejects remote clients before executing SQL", async () => {
  await assert.rejects(rehearseRuntimeFoundation({ connectionParameters: { host: "production.neon.tech", database: "neondb" } }), /PRIVATE_LOCAL_RESTORE_REQUIRED/);
});
test("production runtime foundation contains no fixture, identity or business-row insertion", async () => {
  const sql = await readFile(new URL('./sql/neon-production-runtime-foundation.sql',import.meta.url),'utf8');
  assert.ok(!/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO|FROM|public\.)/i.test(sql));
  assert.ok(!sql.includes('example.com'));
  assert.ok(sql.includes('REVOKE ALL ON public.neon_identity_links FROM PUBLIC'));
  assert.ok(sql.includes('REVOKE ALL ON public.event_tickets FROM PUBLIC'));
});
