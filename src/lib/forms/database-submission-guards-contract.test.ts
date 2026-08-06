import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260806101500_owner_workflows_and_submission_guards.sql",
  ),
  "utf8",
);

describe("owner workflow SQL guards", () => {
  it("keeps mentor booking identity and financial data server-owned", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.protect_mentor_booking_owner_update()",
    );
    expect(migration).toContain("NEW := OLD;");
    expect(migration).toContain(
      "AND OLD.payment_status IN ('success', 'not_required')",
    );
    expect(migration).toContain(
      "CREATE TRIGGER protect_mentor_booking_owner_update_trigger",
    );
  });

  it("requires subscription and lead permissions for owner management", () => {
    expect(migration).toContain(
      'CREATE POLICY "Subscribed college owners manage applications"',
    );
    expect(migration).toContain(
      "public.has_active_subscription(auth.uid(), 'college', i.id, NULL)",
    );
    expect(migration).toContain(
      'CREATE POLICY "Authorized organizers manage event attendees"',
    );
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'event.organize')",
    );
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'lead.view')",
    );
  });
});

describe("direct module-form RPC SQL contract", () => {
  it("privatizes the old implementation behind a validated wrapper", () => {
    expect(migration).toContain(
      "RENAME TO submit_module_form_internal",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.submit_module_form_internal(text, jsonb)",
    );
    expect(migration).toContain(
      "PERFORM public.assert_module_form_payload(p_module, p_payload);",
    );
    expect(migration).toContain(
      "RETURN public.submit_module_form_internal(p_module, p_payload);",
    );
  });

  it("enforces the API payload ceiling, strict fields, and field limits", () => {
    expect(migration).toContain("octet_length(p_payload::text) > 32768");
    expect(migration).toContain("Unexpected form field: %");
    expect(migration).toContain(
      "char_length(btrim(p_payload ->> 'fullName')) NOT BETWEEN 2 AND 120",
    );
    expect(migration).toContain(
      "jsonb_array_length(p_payload -> 'skills') > 30",
    );
    expect(migration).toContain(
      "char_length(btrim(p_payload ->> 'coverLetter')) > 5000",
    );
    expect(migration).toContain(
      "p_payload -> 'consent' IS DISTINCT FROM 'true'::jsonb",
    );
  });
});
