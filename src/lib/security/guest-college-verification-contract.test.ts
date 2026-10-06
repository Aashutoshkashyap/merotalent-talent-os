import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261006110000_verify_guest_college_email_and_whatsapp.sql", "utf8");

describe("guest college verification database boundary", () => {
  it("restricts proof management to the service role and requires both channels", () => {
    expect(migration).toContain("ALTER TABLE public.guest_college_verifications ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.guest_college_verification_sends ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain("challenge.email_verified_at IS NULL");
    expect(migration).toContain("challenge.whatsapp_verified_at IS NULL");
    expect(migration).toContain("challenge.whatsapp_number IS DISTINCT FROM btrim(p_payload ->> 'phone')");
    expect(migration).toContain("challenge.consumed_at IS NOT NULL");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.submit_guest_college_application_before_verification");
  });
});
