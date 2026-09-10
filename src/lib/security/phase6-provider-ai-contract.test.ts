import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Phase 6 provider and AI boundaries", () => {
  it("keeps provider and BYOK tables outside browser RLS policies", () => {
    const migration = read("supabase/migrations/20260910146000_phase6_provider_ai_and_feature_controls.sql");
    expect(migration).toContain("ALTER TABLE public.provider_configurations ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.module_ai_credentials ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("has_entity_feature_access");
    expect(migration).toContain("Only Super Admin can manage feature grants");
  });

  it("requires server authentication and entitlement before AI generation", () => {
    const route = read("app/api/v1/ai/generate/route.ts");
    expect(route).toContain("authenticateRequest(request)");
    expect(route).toContain("requireAIAccess");
    expect(route).not.toContain("localStorage");
    expect(route).toContain("loadModuleAISecret");
  });

  it("does not keep deterministic AI fallback content in the four supported modules", () => {
    const client = read("src/lib/ai/ai-generator.ts");
    expect(client).toContain('throw new Error("AI generation is not enabled for companies.")');
    expect(client).not.toContain("We are seeking an outstanding");
    expect(client).not.toContain("Join us for");
  });

  it("binds payment checkout to the caller's capability and exact entity assignment", () => {
    const route = read("app/api/v1/payments/checkout/route.ts");
    expect(route).toContain("has_active_module_capability");
    expect(route).toContain("has_active_entity_assignment");
    expect(route).toContain("ENTITY_ACCESS_DENIED");
    expect(route).toContain("INVALID_CHECKOUT_SCOPE");
  });
});
