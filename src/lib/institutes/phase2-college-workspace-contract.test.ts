import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260910140000_phase2_college_workspace_and_verification.sql"),
  "utf8",
);
const workspace = readFileSync(
  resolve(process.cwd(), "src/screens/institute/InstituteDashboard.tsx"),
  "utf8",
);
const profileEditor = readFileSync(
  resolve(process.cwd(), "src/components/owner/InstituteProfileEditor.tsx"),
  "utf8",
);
const mediaMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260910141000_phase3_college_media_assignment_access.sql"),
  "utf8",
);

describe("Phase 2 college workspace contract", () => {
  it("calculates verification from accountable ownership and an active paid plan or trial", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.is_college_effectively_verified");
    expect(migration).toContain("s.status IN ('trialing', 'active')");
    expect(migration).toContain("(s.status = 'trialing' OR COALESCE(p.price, 0) > 0)");
    expect(migration).not.toContain("i.is_verified AS payment_verified");
  });

  it("extends signed college media to active entity assignments without weakening other media modules", () => {
    expect(mediaMigration).toContain("authorize_media_access_legacy_phase3");
    expect(mediaMigration).toContain("public.has_active_entity_assignment(actor, 'college', 'college', p_resource_id)");
    expect(mediaMigration).toContain("CREATE OR REPLACE FUNCTION public.update_my_college_media");
    expect(profileEditor).toContain('module="college_logo"');
    expect(profileEditor).toContain('module="college_cover"');
  });

  it("uses the scoped many-college selector and server-side profile update", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_my_college_workspaces()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_my_college_profile");
    expect(workspace).toContain('rpc("get_my_college_workspaces")');
    expect(profileEditor).toContain('rpc("update_my_college_profile"');
    expect(workspace).toContain("managedInstitutes.length > 1");
  });

  it("keeps the expiry state explicit instead of hiding a locked workspace", () => {
    expect(workspace).toContain("Your subscription/trial has expired. Renew to restore College Module access.");
    expect(workspace).toContain("const canAccessApplications = subscription.active");
  });
});
