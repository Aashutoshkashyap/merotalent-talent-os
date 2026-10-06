import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Unified Transaction Ledger and Financial Architecture Contract", () => {
  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20261006170000_unified_transaction_ledger_and_payouts.sql",
  );
  const checkoutRoutePath = resolve(
    process.cwd(),
    "app/api/v1/payments/checkout/route.ts",
  );
  const settlementPath = resolve(
    process.cwd(),
    "src/lib/server/esewa-settlement.ts",
  );
  const adminPaymentsPath = resolve(
    process.cwd(),
    "src/screens/admin/AdminPayments.tsx",
  );

  it("defines parent_payment_id, payout, commission, and reconciliation columns in migration", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("parent_payment_id uuid REFERENCES public.payments(id)");
    expect(sql).toContain("payout_status text");
    expect(sql).toContain("payout_amount numeric(12, 2)");
    expect(sql).toContain("commission_amount numeric(12, 2)");
    expect(sql).toContain("reconciliation_status text");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.admin_extend_subscription");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.admin_verify_and_reconcile_payment");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.admin_record_mentor_payout");
  });

  it("enforces additive extension rule in admin_extend_subscription RPC", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("v_base_time := GREATEST(now(), v_sub.expiry_date);");
    expect(sql).toContain("v_new_expiry := v_base_time + (p_additional_days || ' days')::interval;");
  });

  it("supports mentor payout recording without overwriting original payment", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("'mentor_payout_settlement'");
    expect(sql).toContain("parent_payment_id");
    expect(sql).toContain("ADMIN_RECORD_MENTOR_PAYOUT");
  });

  it("handles event registration and mentor booking checkouts in API route", () => {
    const route = readFileSync(checkoutRoutePath, "utf-8");
    expect(route).toContain("value.eventRegistrationId");
    expect(route).toContain("value.bookingId");
    expect(route).toContain("value.scopeRequestId");
    expect(route).toContain("value.packageId");
  });

  it("settles event registrations and calculates mentor commissions in settlement service", () => {
    const settlement = readFileSync(settlementPath, "utf-8");
    expect(settlement).toContain("checkout.entity_type === \"event_registration\"");
    expect(settlement).toContain("checkout.entity_type === \"mentor_booking\"");
    expect(settlement).toContain("commission_amount");
    expect(settlement).toContain("payout_amount");
  });

  it("renders 10-point transaction inspection and reconciliation in Super Admin Payments view", () => {
    const adminPayments = readFileSync(adminPaymentsPath, "utf-8");
    expect(adminPayments).toContain("Transaction Details & Financial Chain");
    expect(adminPayments).toContain("1. Payer Identity");
    expect(adminPayments).toContain("2. Module & Purpose");
    expect(adminPayments).toContain("3. Financial Breakdown");
    expect(adminPayments).toContain("admin_verify_and_reconcile_payment");
    expect(adminPayments).toContain("admin_record_mentor_payout");
  });
});
