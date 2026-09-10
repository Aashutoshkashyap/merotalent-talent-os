import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260910142000_phase3_scoped_owner_workflow_enforcement.sql",
  ),
  "utf8",
);

describe("Phase 3 scoped workflow policy contract", () => {
  it("keeps entity subscriptions independent from the assigned administrator", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.has_active_entity_subscription");
    expect(migration).toContain("s.entity_type = p_entity_type");
    expect(migration).not.toContain("s.user_id = auth.uid()");
  });

  it("invalidates capabilities and entity assignments when the account is suspended", () => {
    const activeAccountGates = migration.match(/public[.]is_account_active\(p_user_id\)/g) ?? [];
    expect(activeAccountGates).toHaveLength(2);
  });

  it("returns only active self capabilities through the existing access context", () => {
    expect(migration).toContain("'capabilities', (SELECT value FROM capabilities)");
    expect(migration).toContain("umc.user_id = auth.uid()");
  });

  it("adds entity-scope enforcement to job, mentor, and event private workflows", () => {
    for (const expectedPolicy of [
      "Scoped managers view job applications",
      "Scoped managers update job applications",
      "Scoped mentor managers view bookings",
      "Scoped mentor managers update bookings",
      "Scoped organizers view registrations",
      "Scoped organizers update registrations",
    ]) {
      expect(migration).toContain(expectedPolicy);
    }

    expect(migration).toContain("'jobs', 'company', j.company_id");
    expect(migration).toContain("'mentor', 'mentor', mentor_id");
    expect(migration).toContain("'events', 'event', e.id");
  });

  it("requires lead permission and a live entity entitlement before private lead access", () => {
    expect(migration).toContain("public.has_permission(auth.uid(), 'lead.view')");
    expect(migration).toContain("'job_applications', 'read_only'");
    expect(migration).toContain("'mentor_bookings', 'read_only'");
    expect(migration).toContain("'event_registrations', 'read_only'");
  });
});
