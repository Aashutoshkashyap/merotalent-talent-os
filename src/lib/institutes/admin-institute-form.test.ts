import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateInstituteSeatCounts } from "./admin-institute-form";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261004100000_restore_super_admin_institute_writes.sql"),
  "utf8",
);

describe("Super Admin institute writes", () => {
  it("restores insert and update policies only for authenticated platform admins", () => {
    expect(migration).toMatch(/ON public\.institutes FOR INSERT TO authenticated\s+WITH CHECK \(public\.is_platform_admin\(auth\.uid\(\)\)\)/);
    expect(migration).toMatch(/ON public\.institutes FOR UPDATE TO authenticated\s+USING \(public\.is_platform_admin\(auth\.uid\(\)\)\)\s+WITH CHECK \(public\.is_platform_admin\(auth\.uid\(\)\)\)/);
    expect(migration).not.toMatch(/TO anon|TO PUBLIC|DROP POLICY/);
  });

  it("accepts empty or coherent seat counts", () => {
    expect(validateInstituteSeatCounts("", "")).toBeNull();
    expect(validateInstituteSeatCounts("13", "8")).toBeNull();
    expect(validateInstituteSeatCounts("0", "0")).toBeNull();
  });

  it("rejects impossible and malformed seat counts before writing", () => {
    expect(validateInstituteSeatCounts("13", "78")).toBe("Available seats cannot exceed total seats.");
    expect(validateInstituteSeatCounts("-1", "0")).toBe("Total seats must be a non-negative whole number.");
    expect(validateInstituteSeatCounts("13", "1.5")).toBe("Available seats must be a non-negative whole number.");
  });
});
