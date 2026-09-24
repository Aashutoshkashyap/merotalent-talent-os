import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("provider-secret configuration boundaries", () => {
  it("keeps secret storage server-only and returns a safe actionable error", () => {
    const route = read("app/api/v1/admin/providers/[kind]/route.ts");
    expect(route).toContain("PROVIDER_SECRET_STORAGE_UNAVAILABLE");
    expect(route).toContain("PROVIDER_CONFIG_ENCRYPTION_KEY");
    expect(route).not.toContain("NEXT_PUBLIC_PROVIDER_CONFIG_ENCRYPTION_KEY");
  });

  it("keeps Provider Center usable without decrypting provider credentials", () => {
    const route = read("app/api/v1/admin/provider-status/route.ts");
    expect(route).toContain("getProviderStatus");
    expect(route).not.toContain("loadProviderSecret");
    expect(route).not.toContain("decryptProviderSecret");
  });

  it("preserves encrypted fields when a public-only provider update is saved", () => {
    const service = read("src/lib/server/provider-config-service.ts");
    expect(service).toContain("if (encrypted) {");
    expect(service).toContain("configured_at: encrypted ? now : existing.configuredAt");
    expect(service).toContain("payload.secret_ciphertext = encrypted.ciphertext");
  });

  it("explains the deployment requirement without asking for a provider credential", () => {
    const panel = read("src/screens/admin/ProviderConfigurationPanel.tsx");
    expect(panel).toContain("Secure provider-secret storage is not configured on this deployment.");
    expect(panel).toContain("This is the external provider credential, not the application encryption key.");
  });
});
