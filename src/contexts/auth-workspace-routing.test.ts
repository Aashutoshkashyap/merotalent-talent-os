import { describe, expect, it } from "vitest";

import { resolveWorkspacePath } from "@/lib/auth/workspace-path";

describe("resolveWorkspacePath", () => {
  it("keeps Super Admin separate from module workspaces", () => {
    expect(resolveWorkspacePath(["admin"], ["college.manage"])).toBe("/admin");
  });

  it("routes delegated module access without needing a self-assigned role", () => {
    expect(resolveWorkspacePath(["talent"], ["college.manage"])).toBe("/institute");
    expect(resolveWorkspacePath(["talent"], ["job.post"])).toBe("/company");
    expect(resolveWorkspacePath(["talent"], ["mentor.manage"])).toBe("/mentor");
  });

  it("routes an approved module capability without a legacy primary role", () => {
    expect(resolveWorkspacePath(["talent"], [], ["college"])).toBe("/institute");
    expect(resolveWorkspacePath(["talent"], [], ["jobs"])).toBe("/company");
    expect(resolveWorkspacePath(["talent"], [], ["mentor"])).toBe("/mentor");
  });
});
