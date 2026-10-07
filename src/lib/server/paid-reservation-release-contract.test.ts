import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const settlement = readFileSync(resolve(process.cwd(), "src/lib/server/esewa-settlement.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261007170000_release_failed_paid_reservations.sql"), "utf8");

describe("failed paid reservations", () => {
  it("does not leave mentor or event capacity reserved after failure", () => {
    expect(settlement.match(/payment_status: "failed", status: "cancelled"/g)).toHaveLength(2);
    expect(migration).toContain("release_failed_paid_reservations_trigger");
    expect(migration).toContain("release_expired_checkout_reservation_trigger");
    expect(migration).toContain("payment_status <> 'success'");
  });
});
