import { describe, expect, it } from "vitest";
import { isConservativeDraftCandidate } from "../../../scripts/job-draft-cleanup-policy.mjs";

const owner = "10000000-0000-4000-8000-000000000001";
const job = "30000000-0000-4000-8000-000000000003";
const path = `${owner}/job_attachment/${job}/40000000-0000-4000-8000-000000000004.pdf`;
const now = Date.UTC(2026, 9, 11);
const old = new Date(now - 73 * 60 * 60 * 1000).toISOString();
const row = { path, user_id: owner, job_id: job, state: "draft", application_id: null, uploaded_at: old };

describe("conservative staging job-draft cleanup", () => {
  it("accepts only an old registered draft with matching owner and job path", () => {
    expect(isConservativeDraftCandidate(row, now)).toBe(true);
  });
  it("never deletes a submitted document, even when old", () => {
    expect(isConservativeDraftCandidate({ ...row, state: "submitted", application_id: job }, now)).toBe(false);
  });
  it("rejects recent files and unrelated paths", () => {
    expect(isConservativeDraftCandidate({ ...row, uploaded_at: new Date(now - 60_000).toISOString() }, now)).toBe(false);
    expect(isConservativeDraftCandidate({ ...row, user_id: job }, now)).toBe(false);
    expect(isConservativeDraftCandidate({ ...row, path: path.replace("job_attachment", "resume") }, now)).toBe(false);
  });
});
