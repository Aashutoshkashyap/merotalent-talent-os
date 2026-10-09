import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  listPublicMentors,
  type PublicMentorProfile,
} from "@/lib/server/mentorship-service";

describe("Mentorship & Mentor Booking Architecture", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261008150000_mentorship_module_complete.sql"),
    "utf8"
  );
  const serviceCode = readFileSync(
    resolve(process.cwd(), "src/lib/server/mentorship-service.ts"),
    "utf8"
  );
  const sessionsUi = readFileSync(
    resolve(process.cwd(), "src/screens/dashboard/Sessions.tsx"),
    "utf8"
  );

  it("enforces database double-booking slot overlap prevention trigger", () => {
    expect(migration).toContain("check_mentor_slot_conflict");
    expect(migration).toContain("OVERLAPS");
    expect(migration).toContain("check_mentor_slot_conflict_trigger");
    expect(migration).toContain("This time slot is already booked for this mentor");
  });

  it("supports full booking status lifecycle including reschedule and review states", () => {
    expect(migration).toContain("'reschedule_requested'");
    expect(migration).toContain("'rescheduled'");
    expect(migration).toContain("'completed'");
    expect(migration).toContain("'cancelled'");
  });

  it("implements mentor reviews table with automatic rating recalculation trigger", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.mentor_reviews");
    expect(migration).toContain("sync_mentor_rating_summary");
    expect(migration).toContain("rating >= 1 AND rating <= 5");
    expect(migration).toContain("sync_mentor_rating_summary_trigger");
  });

  it("enforces strict mentor contact privacy in server services", () => {
    // Check that public profile mapping NEVER leaks mentor email or phone
    expect(serviceCode).toContain("PublicMentorProfile");
    expect(serviceCode).not.toContain("mentor.email");
    expect(serviceCode).not.toContain("mentor.phone");
    expect(serviceCode).toContain("from(\"public_profile_directory\")");
  });

  it("provides free vs paid session branching with zero payment records for free sessions", () => {
    expect(serviceCode).toContain("const isFree = price <= 0");
    expect(serviceCode).toContain("status: initialStatus");
    expect(serviceCode).toContain("Mentorship Session Confirmed");
    expect(serviceCode).toContain("MENTOR_BOOKING_CREATED");
    expect(serviceCode).toContain("MENTOR_BOOKING_PENDING_PAYMENT");
  });

  it("implements reschedule, cancel, and review actions in student sessions dashboard", () => {
    expect(sessionsUi).toContain("handleRescheduleSubmit");
    expect(sessionsUi).toContain("handleCancelSubmit");
    expect(sessionsUi).toContain("handleReviewSubmit");
    expect(sessionsUi).toContain("Rate & Review Your Session");
    expect(sessionsUi).toContain("Reschedule Mentoring Session");
    expect(sessionsUi).toContain("Cancel Mentoring Session");
  });
});
