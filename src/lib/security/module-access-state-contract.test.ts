import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("module access purchase state", () => {
  it("does not keep offering payment for active module entitlements", () => {
    const requestPage = readFileSync(resolve(process.cwd(), "src/screens/RequestSubAdminAccess.tsx"), "utf8");
    const payments = readFileSync(resolve(process.cwd(), "src/screens/dashboard/Payments.tsx"), "utf8");
    expect(requestPage).toContain("activeEntitlementModules");
    expect(requestPage).toContain("Open {module.replaceAll");
    expect(payments).toContain("activeEntitlementKeys");
    expect(payments).toContain("Active — open workspace");
  });
});
