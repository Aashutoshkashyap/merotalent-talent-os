import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(resolve(process.cwd(), "app/api/v1/submissions/[module]/route.ts"), "utf8");
const jobWizard = readFileSync(resolve(process.cwd(), "src/components/jobs/JobApplicationWizard.tsx"), "utf8");
const mentorBooking = readFileSync(resolve(process.cwd(), "src/components/mentors/BookingDialog.tsx"), "utf8");

describe("module submissions fail closed", () => {
  it("never falls back to privileged direct table inserts when a domain RPC fails", () => {
    expect(route).not.toContain("Direct table insertion fallback");
    expect(route).not.toContain('.from("competition_registrations")');
    expect(route).toContain('rpc("submit_module_form"');
    expect(jobWizard).not.toContain("Fallback: Direct insert");
    expect(mentorBooking).not.toContain("Direct table fallback");
  });
});
