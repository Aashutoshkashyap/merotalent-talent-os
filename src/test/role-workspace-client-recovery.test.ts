import { afterEach, describe, expect, it, vi } from "vitest";
import { requestRoleWorkspace, saveRoleWorkspaceRecord } from "@/lib/neon/role-workspaces-client";
afterEach(() => vi.unstubAllGlobals());
describe("shared role workspace error recovery", () => {
  it("uses a bounded same-origin uncached request and returns trusted data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { snapshot: {} } }))));
    expect(await requestRoleWorkspace("/workspace")).toEqual({ snapshot: {} });
    expect(fetch).toHaveBeenCalledWith("/workspace", expect.objectContaining({ credentials: "same-origin", cache: "no-store", signal: expect.any(AbortSignal) }));
  });
  it("shows nested API error messages and rejects malformed success responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Access denied" } }), { status: 403 }))
      .mockResolvedValueOnce(new Response("null")));
    await expect(requestRoleWorkspace("/workspace")).rejects.toThrow("Access denied");
    await expect(requestRoleWorkspace("/workspace")).rejects.toThrow("workspace operation failed");
  });
  it("does not retry an ambiguous timed-out mutation and tells the user to verify saved state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    const result = await saveRoleWorkspaceRecord("mentor-service", { price: 0 }, "service");
    expect(result.error?.message).toContain("check whether it saved before trying again");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
