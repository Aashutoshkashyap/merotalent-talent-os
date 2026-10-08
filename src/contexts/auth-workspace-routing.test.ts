import { describe, expect, it } from "vitest";

import { resolveWorkspacePath } from "@/lib/auth/workspace-path";

describe("resolveWorkspacePath", () => {
  it("keeps Super Admin separate from module workspaces", () => {
    expect(resolveWorkspacePath(["admin"], ["college.manage"])).toBe("/admin");
  });

  it("keeps delegated module access on the shared student dashboard by default", () => {
    expect(resolveWorkspacePath(["talent"], ["college.manage"])).toBe("/dashboard");
    expect(resolveWorkspacePath(["talent"], ["job.post"])).toBe("/dashboard");
    expect(resolveWorkspacePath(["talent"], ["mentor.manage"])).toBe("/dashboard");
  });

  it("keeps approved module capabilities as explicit workspace navigation", () => {
    expect(resolveWorkspacePath(["talent"], [], ["college"])).toBe("/dashboard");
    expect(resolveWorkspacePath(["talent"], [], ["jobs"])).toBe("/dashboard");
    expect(resolveWorkspacePath(["talent"], [], ["mentor"])).toBe("/dashboard");
  });
});
