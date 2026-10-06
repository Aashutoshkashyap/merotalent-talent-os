import { describe, expect, it, vi } from "vitest";
import { signOutToPublicHome } from "./sign-out";

describe("sign out destination", () => {
  it("clears local state and opens the public landing page after successful sign out", async () => {
    const clear = vi.fn();
    const redirect = vi.fn();
    const result = await signOutToPublicHome(
      async () => ({ error: null }),
      clear,
      redirect,
    );

    expect(result).toBeNull();
    expect(clear).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/");
    expect(clear.mock.invocationCallOrder[0]).toBeLessThan(redirect.mock.invocationCallOrder[0]);
  });

  it("does not redirect or pretend to clear a session when sign out fails", async () => {
    const clear = vi.fn();
    const redirect = vi.fn();
    const failure = new Error("Auth unavailable");
    const result = await signOutToPublicHome(
      async () => ({ error: failure }),
      clear,
      redirect,
    );

    expect(result).toBe(failure);
    expect(clear).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
