import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260925090000_atomic_provider_configuration_save.sql"), "utf8");

describe("atomic provider configuration persistence", () => {
  it("uses a server-only transactional RPC that preserves a credential unless replacement ciphertext is supplied", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_save_provider_configuration");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.admin_save_provider_configuration");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("secret_ciphertext = COALESCE(EXCLUDED.secret_ciphertext, public.provider_configurations.secret_ciphertext)");
    expect(migration).toContain("secret_iv = COALESCE(EXCLUDED.secret_iv, public.provider_configurations.secret_iv)");
    expect(migration).toContain("secret_tag = COALESCE(EXCLUDED.secret_tag, public.provider_configurations.secret_tag)");
  });

  it("writes the audit record in the same transaction and fails closed if audit persistence fails", () => {
    expect(migration).toContain("INSERT INTO public.audit_logs");
    expect(migration).toContain("EXCEPTION WHEN OTHERS THEN");
    expect(migration).toContain("Provider configuration audit could not be persisted");
  });
});
