import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261007160000_enforce_mentor_published_availability.sql"), "utf8");
const booking = readFileSync(resolve(process.cwd(), "src/components/mentors/BookingDialog.tsx"), "utf8");

describe("mentor availability contract", () => {
  it("enforces the published schedule in the database", () => {
    expect(migration).toContain("BEFORE INSERT OR UPDATE OF mentor_id, scheduled_start");
    expect(migration).toContain("The mentor is not available at the selected time");
  });

  it("submits a 24-hour time accepted by the server validator", () => {
    expect(booking).toContain('const defaultTimeSlots = ["09:00"');
    expect(booking).not.toContain('"09:00 AM"');
  });
});
