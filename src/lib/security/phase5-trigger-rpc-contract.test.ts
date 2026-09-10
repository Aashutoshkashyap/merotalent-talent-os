import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260910144000_phase5_revoke_trigger_rpc_access.sql"),
  "utf8",
);

describe("Phase 5 trigger RPC boundary", () => {
  it("removes direct API execution from trigger-only helpers", () => {
    for (const functionName of [
      "validate_entity_admin_assignment()",
      "sync_legacy_college_admin_assignment()",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${functionName}`);
      expect(migration).toContain("FROM PUBLIC, anon, authenticated;");
    }
  });

  it("does not add a browser-facing grant for either trigger helper", () => {
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*?TO authenticated/);
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*?TO anon/);
  });
});
