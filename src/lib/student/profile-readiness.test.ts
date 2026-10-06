import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { missingStudentProfileFields, valuesFromStudentProfile } from "./profile-readiness";

const profile = {
  full_name: "Maya Rai",
  email: "old@example.com",
  phone: "9800000000",
  location: "Kathmandu",
  education: "BSc CSIT",
};

describe("student application profile", () => {
  it("requires saved basic details across modules and education for applications", () => {
    const basic = { ...profile, location: "", education: "" };
    expect(missingStudentProfileFields("mentor_booking", basic, "maya@example.com")).toEqual(["location"]);
    expect(missingStudentProfileFields("event_registration", basic, "maya@example.com")).toEqual(["location"]);
    expect(missingStudentProfileFields("college_application", basic, "maya@example.com")).toEqual(["location", "education"]);
    expect(missingStudentProfileFields("job_application", basic, "maya@example.com")).toEqual(["location", "education"]);
    expect(missingStudentProfileFields("job_application", profile, "maya@example.com")).toEqual([]);
    expect(missingStudentProfileFields("event_registration", { ...profile, phone: "not-a-phone" }, "maya@example.com")).toEqual(["valid phone number"]);
    expect(missingStudentProfileFields("event_registration", profile)).toEqual(["email"]);
  });

  it("takes contact data from the saved profile instead of editable form values", () => {
    expect(valuesFromStudentProfile("college_application", {
      collegeId: "college-id",
      fullName: "Spoofed",
      email: "wrong@example.com",
      phone: "1234567",
      message: "Please send the prospectus",
    }, profile, "maya@example.com")).toMatchObject({
      fullName: "Maya Rai",
      email: "maya@example.com",
      phone: "9800000000",
      currentQualification: "BSc CSIT",
      message: "Please send the prospectus",
    });
  });

  it("retains module-specific student answers", () => {
    expect(valuesFromStudentProfile("college_application", {
      currentQualification: "+2 Science, 3.8 GPA",
      intendedCourse: "Engineering",
    }, profile, "maya@example.com")).toMatchObject({
      currentQualification: "+2 Science, 3.8 GPA",
      intendedCourse: "Engineering",
    });
  });
});

describe("profile gate integration", () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

  it("keeps guest college enquiries but gates signed-in submissions at API and RPC", () => {
    const route = read("app/api/v1/submissions/[module]/route.ts");
    const migration = read("supabase/migrations/20261006100000_require_student_profile_for_submissions.sql");
    expect(route).toContain('module === "college_application" && !getBearerToken(request)');
    expect(route).toContain('code: "PROFILE_INCOMPLETE"');
    expect(migration).toContain("RENAME TO submit_module_form_before_profile_gate");
    expect(migration).toContain("RENAME TO submit_college_application_before_profile_gate");
    expect(migration).toContain("public.assert_student_profile_ready");
    expect(migration).not.toContain("submit_guest_college_application(jsonb");
  });
});
