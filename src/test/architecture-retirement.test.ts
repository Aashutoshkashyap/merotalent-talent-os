import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEROTALENT_BRAND } from "@/lib/brand";
const source = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");
describe("canonical architecture retirement and brand", () => {
  it("separates erased server types from conditional runtime SDK loading", () => {
    // CI independently checks freshness. Do not fork a second repository-wide
    // TypeScript scan inside a memory-constrained parallel UI test worker.
    const inventory = JSON.parse(source("docs/architecture/legacy-cleanup-inventory.json")).runtimeImportInventory;
    const server = inventory.records.find((row: { file: string }) => row.file === "src/lib/server/supabase.ts");
    expect(server.imports.find((edge: { kind: string }) => edge.kind === "static").typeOnly).toBe(true);
    expect(server.imports.filter((edge: { kind: string }) => edge.kind === "require")).toHaveLength(2);
    expect(inventory.staticRuntimeFiles).toBeLessThan(inventory.staticFiles);
    expect(inventory.typeOnlyFiles).toBeGreaterThan(0);
  });
  it("locks exact WASI dependencies even on platforms where the binding is optional", () => {
    const packages = JSON.parse(source("package-lock.json")).packages;
    // Newer Rolldown releases no longer ship a WASI package; every native
    // binding they actually declare must still be locked for Linux CI.
    for (const [name, version] of Object.entries(packages["node_modules/rolldown"].optionalDependencies)) {
      expect(packages[`node_modules/${name}`]?.version, `rolldown must lock ${name}`).toBe(version);
    }
    const wasiParents = Object.keys(packages).filter(name => name.endsWith("binding-wasm32-wasi"));
    expect(wasiParents).toContain("node_modules/@unrs/resolver-binding-wasm32-wasi");
    for (const parent of wasiParents) {
      for (const dependency of ["@emnapi/core", "@emnapi/runtime"]) {
        const expected = packages[parent].dependencies[dependency];
        const resolved = packages[`${parent}/node_modules/${dependency}`]
          ?? packages[`node_modules/${dependency}`];
        expect(resolved?.version, `${parent} must lock ${dependency}`).toBe(expected);
      }
    }
  });
  it("locks patched dependency versions without forcing a framework upgrade", () => {
    const packages = JSON.parse(source("package-lock.json")).packages;
    const atLeast = (version: string, floor: number[]) => {
      const parts = version.split(".").map(Number);
      return parts[0] === floor[0] && (parts[1] > floor[1] || parts[1] === floor[1] && parts[2] >= floor[2]);
    };
    for (const [name, entry] of Object.entries(packages) as [string, { version?: string }][]) {
      if (name.endsWith("node_modules/brace-expansion")) {
        const [major, minor, patch] = entry.version!.split(".").map(Number);
        expect(major === 1 ? minor > 1 || patch >= 21 : major === 5 && patch >= 12).toBe(true);
      }
    }
    expect(atLeast(packages["node_modules/vitest"].version, [4, 1, 12])).toBe(true);
    expect(atLeast(packages["node_modules/@vitest/mocker"].version, [4, 1, 12])).toBe(true);
    expect(atLeast(packages["node_modules/undici"].version, [7, 29, 1])).toBe(true);
    expect(packages["node_modules/tailwindcss"].version).toMatch(/^3\./);
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
