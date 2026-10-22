import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEROTALENT_BRAND } from "@/lib/brand";
const source = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");
describe("canonical architecture retirement and brand", () => {
  it("locks exact WASI dependencies even on platforms where the binding is optional", () => {
    const packages = JSON.parse(source("package-lock.json")).packages;
    for (const parent of ["@rolldown/binding-wasm32-wasi", "@unrs/resolver-binding-wasm32-wasi"]) {
      for (const dependency of ["@emnapi/core", "@emnapi/runtime"]) {
        const expected = packages[`node_modules/${parent}`].dependencies[dependency];
        const resolved = packages[`node_modules/${parent}/node_modules/${dependency}`]
          ?? packages[`node_modules/${dependency}`];
        expect(resolved?.version, `${parent} must lock ${dependency}`).toBe(expected);
      }
    }
  });
  it("does not mount or retain the abandoned self-hosted authentication implementation", () => {
    expect(existsSync(`${process.cwd()}/src/lib/server/better-auth.ts`)).toBe(false);
    expect(existsSync(`${process.cwd()}/src/lib/server/neon-auth-experiment.ts`)).toBe(false);
    const deps = JSON.parse(source("package.json")).dependencies;
    expect(deps["@neondatabase/auth"]).toBeDefined();
    expect(deps["@neondatabase/serverless"]).toBeUndefined();
    expect(deps["better-auth"]).toBeUndefined();
    expect(deps["xlsx"]).toBeUndefined();
  });
  it("keeps the genuine existing mark, canonical spelling, and one metadata identity", () => {
    expect(MEROTALENT_BRAND.name).toBe("MeroTalent");
    expect(existsSync(`${process.cwd()}/public${MEROTALENT_BRAND.logo}`)).toBe(true);
    expect(source("app/layout.tsx")).toContain("default: brand.title");
    for (const file of ["Navbar", "HeaderNav", "Footer"])
      expect(source(`src/components/landing/${file}.tsx`)).toContain("brand.logo");
    for (const file of ["src/components/auth/AuthShell.tsx", "src/components/admin/AdminSidebar.tsx", "src/components/dashboard/DashboardSidebar.tsx"])
      expect(source(file)).toContain("<BrandMark");
  });
  it("retains source recovery and append-only migration assets", () => {
    expect(existsSync(`${process.cwd()}/src/lib/auth/legacy-recovery.ts`)).toBe(true);
    expect(existsSync(`${process.cwd()}/scripts/require-supabase-source-readonly.mjs`)).toBe(true);
    expect(existsSync(`${process.cwd()}/docs/pending-migrations.sql`)).toBe(true);
    expect(source("src/App.tsx")).toContain('lazy(() => import("./screens/auth/LegacyAccountRecovery"))');
    expect(source("src/App.tsx")).toContain('path="/account-recovery/source"');
    expect(source("src/screens/auth/OAuthCallback.tsx")).not.toContain('from "@/lib/auth/legacy-recovery"');
    expect(source("src/screens/auth/OAuthCallback.tsx")).toContain('lazy(() => import("./LegacyAccountRecovery"))');
  });
});
