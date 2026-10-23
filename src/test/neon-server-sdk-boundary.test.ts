// @vitest-environment node
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const sdkPath = require.resolve("@supabase/supabase-js");
const evaluation = vi.hoisted(() => ({ count: 0 }));
vi.mock("@supabase/supabase-js", () => {
  evaluation.count += 1;
  return { createClient: vi.fn() };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Neon server legacy SDK evaluation boundary", () => {
  it.each(["neon-staging", "neon-production"])("does not load the SDK for %s, even when a legacy factory is called", async mode => {
    vi.stubEnv("MEROTALENT_BACKEND_MODE", mode);
    vi.stubEnv("NEXT_PUBLIC_MEROTALENT_BACKEND_MODE", mode);
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(require.cache[sdkPath]).toBeUndefined();
    const factories = await import("@/lib/server/supabase");
    expect(evaluation.count).toBe(0);
    expect(require.cache[sdkPath]).toBeUndefined();
    expect(evaluation.count).toBe(0);
    expect(() => factories.getAdminClient()).toThrow("Legacy database runtime is disabled");
    expect(() => factories.getUserClient("not-a-source-token")).toThrow("Legacy database runtime is disabled");
    expect(require.cache[sdkPath]).toBeUndefined();
    expect(evaluation.count).toBe(0);
  });

  it("rejects inconsistent runtime selection before loading the SDK", async () => {
    vi.stubEnv("MEROTALENT_BACKEND_MODE", "legacy");
    vi.stubEnv("NEXT_PUBLIC_MEROTALENT_BACKEND_MODE", "neon-production");
    const factories = await import("@/lib/server/supabase");
    expect(() => factories.getAdminClient()).toThrow("legacy fallback is prohibited");
    expect(() => factories.getUserClient("not-a-source-token")).toThrow("legacy fallback is prohibited");
    expect(require.cache[sdkPath]).toBeUndefined();
  });
});
