import { afterEach, describe, expect, it, vi } from "vitest";
import { submitLegacyRecoveryProof, supportsSourceRecoveryPopup, isSourceRecoveryCallback, sourceRecoveryMarker } from "./legacy-recovery";

afterEach(() => vi.unstubAllGlobals());
describe("legacy account recovery browser proof", () => {
  it("uses a short-lived same-window marker only to select recovery UI, not as ownership proof", () => {
    window.sessionStorage.setItem(sourceRecoveryMarker, String(Date.now()));
    expect(isSourceRecoveryCallback()).toBe(true);
    window.sessionStorage.setItem(sourceRecoveryMarker, String(Date.now() - 11 * 60_000));
    expect(isSourceRecoveryCallback()).toBe(false);
    window.sessionStorage.setItem(sourceRecoveryMarker, String(Date.now() + 60_000));
    expect(isSourceRecoveryCallback()).toBe(false);
    window.sessionStorage.removeItem(sourceRecoveryMarker);
    expect(isSourceRecoveryCallback()).toBe(false);
  });
  it("sends only the current source session proof to the same-origin server, never password or requested access", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { status: "linked" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    await submitLegacyRecoveryProof("current-source-token");
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/neon-staging/auth/link-legacy");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ sourceAccessToken: "current-source-token" });
    expect(fetcher.mock.calls[0][1].credentials).toBe("same-origin");
  });
  it("does not show success for an unauthorized, failed or malformed link response", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "LEGACY_IDENTITY_CONFLICT" }), { status: 409 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(submitLegacyRecoveryProof("proof")).rejects.toThrow("already connected");
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    await expect(submitLegacyRecoveryProof("proof")).rejects.toThrow("could not be restored");
  });
  it("uses only source-approved local, canonical or preview callback origins", () => {
    expect(supportsSourceRecoveryPopup("http://localhost:3001")).toBe(true);
    expect(supportsSourceRecoveryPopup("https://merotalent-preview.vercel.app")).toBe(true);
    expect(supportsSourceRecoveryPopup("http://localhost:3210")).toBe(false);
    expect(supportsSourceRecoveryPopup("https://www.merotalent.com")).toBe(true);
    expect(supportsSourceRecoveryPopup("https://merotalent.com")).toBe(true);
    expect(supportsSourceRecoveryPopup("https://www.merotalent.com:444")).toBe(false);
    expect(supportsSourceRecoveryPopup("https://www.merotalent.com.attacker.test")).toBe(false);
    expect(supportsSourceRecoveryPopup("https://attacker@www.merotalent.com")).toBe(false);
    expect(supportsSourceRecoveryPopup("https://merotalent-preview.vercel.app.attacker.test")).toBe(false);
  });
});
