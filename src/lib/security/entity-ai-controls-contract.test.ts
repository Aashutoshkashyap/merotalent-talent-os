import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("entity-scoped module-admin AI controls", () => {
  const controls = read("src/components/owner/EntityAIControls.tsx");
  const access = read("src/lib/server/ai-access.ts");
  const byok = read("app/api/v1/ai/byok/route.ts");

  it("binds each workspace UI action to a precise module entity", () => {
    expect(controls).toContain("entityType, entityId");
    expect(controls).toContain('"/api/v1/ai/generate"');
    expect(controls).toContain('"/api/v1/ai/byok"');
    expect(controls).toContain("module, entity_type: entityType, entity_id: entityId");
  });

  it("enforces capability, exact assignment, and an AI feature server-side", () => {
    expect(access).toContain("has_active_module_capability");
    expect(access).toContain("has_active_entity_assignment");
    expect(access).toContain("ai.description.generate");
    expect(access).toContain("AI_NOT_ENTITLED");
  });

  it("keeps BYOK encrypted, auditable, and restricted to the supported adapter", () => {
    expect(byok).toContain('value.providerName !== "openai-compatible"');
    expect(byok).toContain("encryptProviderSecret");
    expect(byok).toContain("configure_module_ai_byok");
    expect(byok).toContain('select("provider_name,is_enabled,configured_at,updated_at,disabled_at")');
  });

  it("attaches Jobs, Mentor and Events controls only in their managed record editors", () => {
    const owners = read("src/components/owner/RoleOwnerManagement.tsx");
    expect(owners).toContain('module="jobs" entityType="company"');
    expect(owners).toContain('module="mentor" entityType="mentor"');
    expect(owners).toContain('module="events" entityType="event"');
  });

  it("provides a single authenticated workspace that lists only the caller's assigned entities", () => {
    const workspace = read("src/screens/role/ModuleAIWorkspace.tsx");
    const app = read("src/App.tsx");
    expect(workspace).toContain('from("entity_admin_assignments")');
    expect(workspace).toContain('.eq("user_id", user.id)');
    expect(workspace).toContain('moduleKey === "jobs"');
    expect(workspace).toContain('moduleKey === "mentor"');
    expect(workspace).toContain('moduleKey === "events"');
    expect(app).toContain('path="ai-workspace"');
  });
});
