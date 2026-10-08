import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("workspace routing and module request schema", () => {
  it("keeps the college lock inside the explicitly opened institute workspace", () => {
    const workspace = readFileSync(
      resolve(process.cwd(), "src/screens/institute/InstituteDashboard.tsx"),
      "utf8",
    );

    expect(workspace).toContain("College workspace locked");
    expect(workspace).toContain("Your subscription/trial has expired. Renew to restore College Module access.");
    expect(workspace).toContain('to="/dashboard"');
  });

  it("accepts canonical module request keys without removing legacy compatibility", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20261008120000_align_module_request_constraint_with_canonical_keys.sql",
      ),
      "utf8",
    );

    for (const moduleKey of ["college", "jobs", "mentor", "events", "courses"]) {
      expect(migration).toContain(`'${moduleKey}'`);
    }
    for (const legacyKey of ["institutions", "mentors", "companies"]) {
      expect(migration).toContain(`'${legacyKey}'`);
    }
  });
});
