import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const seedScript = readFileSync(
  resolve(process.cwd(), "scripts/seed-test-users.mjs"),
  "utf8",
);
const example = JSON.parse(
  readFileSync(resolve(process.cwd(), ".seeds/users.example.json"), "utf8"),
) as {
  users: Array<{ role: string; fullName: string }>;
};

describe("secure QA seed contract", () => {
  it("requires the explicit project-ref guard before creating a privileged client", () => {
    const guardIndex = seedScript.indexOf("confirmedRef !== actualRef");
    const clientIndex = seedScript.indexOf("const client = createClient(url, secret");

    expect(guardIndex).toBeGreaterThan(-1);
    expect(clientIndex).toBeGreaterThan(guardIndex);
    expect(seedScript).toContain("SEED_CONFIRM_PROJECT_REF must exactly match");
  });

  it("uses the default free-tier RPC and falls back only when that RPC is missing", () => {
    expect(seedScript).toContain('client.rpc("provision_default_free_tier"');
    expect(seedScript).toContain('code === "PGRST202"');
    expect(seedScript).toContain('code === "42883"');
    expect(seedScript).toContain("if (!isMissingFreeTierRpcError(error)) throw error;");
  });

  it("keeps owner content private while seeding all four activity types", () => {
    expect(seedScript).toContain('is_verified: false');
    expect(seedScript).toContain('is_available: false');
    expect(seedScript).toContain('status: "draft"');
    expect(seedScript).toContain('approval_status: "pending"');

    for (const table of [
      "college_applications",
      "job_applications",
      "mentor_bookings",
      "event_registrations",
    ]) {
      expect(seedScript).toContain(`"${table}"`);
    }
    expect(seedScript).toContain("Lead trigger verification failed");
    expect(seedScript).toContain("Notification trigger verification failed");
  });

  it("uses the five concise QA display names", () => {
    expect(
      Object.fromEntries(example.users.map((user) => [user.role, user.fullName])),
    ).toEqual({
      admin: "QA Admin",
      talent: "QA Student",
      institution: "QA College",
      company: "QA Company",
      mentor: "QA Mentor",
    });
  });

  it("does not pass password values to console output", () => {
    const consoleStatements = [...seedScript.matchAll(/console[.](?:log|warn|error)[(]([\s\S]*?)[)][;]/g)]
      .map((match) => match[1]);

    expect(consoleStatements.length).toBeGreaterThan(0);
    for (const statement of consoleStatements) {
      expect(statement).not.toMatch(/seed[.]password|candidate[.]password/i);
    }
  });
});
