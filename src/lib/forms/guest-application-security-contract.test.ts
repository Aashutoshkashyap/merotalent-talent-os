import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260826113000_guest_applications_and_approved_module_access.sql"),
  "utf8",
);

describe("guest college application and module-access hardening", () => {
  it("keeps guest submission server-only and claims it with browser token plus verified email", () => {
    expect(migration).toContain("ALTER COLUMN applicant_id DROP NOT NULL");
    expect(migration).toContain("IF auth.role() <> 'service_role'");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.submit_guest_college_application(jsonb, text, text)\nTO service_role");
    expect(migration).toContain("public.claim_guest_college_applications(p_guest_token text)");
    expect(migration).toContain("AND lower(ca.email) = trusted_email");
  });

  it("turns module signup intent into an auditable request rather than a client-granted role", () => {
    expect(migration).toContain("VALUES (NEW.id, 'talent'::public.app_role)");
    expect(migration).toContain("'New module access request'");
    expect(migration).toContain("public.request_initial_module_access(p_role text)");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.claim_initial_oauth_role(text)");
  });

  it("notifies and authorizes only assigned college administrators", () => {
    expect(migration).toContain("public.notify_assigned_college_admins()");
    expect(migration).toContain("JOIN public.institute_admins ia ON ia.institute_id = i.id");
    expect(migration).toContain("public.has_entity_entitlement(i.owner_user_id, 'college', i.id");
  });
});
