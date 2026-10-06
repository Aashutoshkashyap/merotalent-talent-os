import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Payment Proof & Exception Reconciliation Architecture Contract", () => {
  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20261007100000_payment_proof_and_exception_reconciliation.sql",
  );
  const userPaymentsPath = resolve(
    process.cwd(),
    "src/screens/dashboard/Payments.tsx",
  );
  const adminPaymentsPath = resolve(
    process.cwd(),
    "src/screens/admin/AdminPayments.tsx",
  );

  it("defines public.payment_proofs table anchored strictly to public.payments", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.payment_proofs");
    expect(sql).toContain("payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE");
    expect(sql).toContain("uploaded_by_user_id uuid NOT NULL REFERENCES auth.users(id)");
    expect(sql).toContain("storage_path text NOT NULL");
    expect(sql).toContain("proof_type text NOT NULL");
    expect(sql).toContain("CHECK (status IN ('pending', 'accepted', 'rejected'))");
    expect(sql).toContain("reviewed_by_user_id uuid REFERENCES auth.users(id)");
  });

  it("configures private storage bucket payment-proofs with strict RLS", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("'payment-proofs'");
    expect(sql).toContain("public = false");
    expect(sql).toContain("CREATE POLICY \"Authenticated users upload own payment proofs\"");
    expect(sql).toContain("CREATE POLICY \"Users and Admins read payment proofs\"");
  });

  it("defines submit_payment_proof RPC that flags payment for review and notifies Super Admins", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.submit_payment_proof");
    expect(sql).toContain("reconciliation_status = 'manual_review_required'");
    expect(sql).toContain("INSERT INTO public.notifications");
    expect(sql).toContain("INSERT INTO public.audit_logs");
    expect(sql).toContain("'SUBMIT_PAYMENT_PROOF'");
  });

  it("defines admin_review_payment_proof RPC that reconciles existing payment and activates service upon acceptance", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.admin_review_payment_proof");
    expect(sql).toContain("IF NOT public.is_platform_admin(v_actor_id) THEN");
    expect(sql).toContain("reconciliation_status = 'reconciled'");
    expect(sql).toContain("PERFORM public.activate_verified_college_scope_request");
    expect(sql).toContain("UPDATE public.mentor_bookings");
    expect(sql).toContain("UPDATE public.event_registrations");
    expect(sql).toContain("'ACCEPT_PAYMENT_PROOF'");
    expect(sql).toContain("'REJECT_PAYMENT_PROOF'");
  });

  it("provides user dashboard UI to submit payment proof for non-success transactions", () => {
    const userPayments = readFileSync(userPaymentsPath, "utf-8");
    expect(userPayments).toContain("Submit Payment Proof");
    expect(userPayments).toContain("submit_payment_proof");
    expect(userPayments).toContain("Uploading payment proof does not automatically activate access");
  });

  it("provides Super Admin inspection UI with secure document preview and proof review actions", () => {
    const adminPayments = readFileSync(adminPaymentsPath, "utf-8");
    expect(adminPayments).toContain("Payment Exception Evidence");
    expect(adminPayments).toContain("Open Secure Evidence Document");
    expect(adminPayments).toContain("Accept & Reconcile");
    expect(adminPayments).toContain("Reject Proof");
    expect(adminPayments).toContain("admin_review_payment_proof");
  });
});
