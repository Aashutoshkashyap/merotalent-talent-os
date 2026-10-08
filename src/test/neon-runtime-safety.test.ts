import { describe, expect, it } from "vitest";
import { getNeonConfig, getNeonDatabaseConfig } from "@/lib/neon/neon-config";
import { NeonDatabaseClient } from "@/lib/neon/neon-db";
import { GET as authRoute } from "../../app/api/auth/[...all]/route";
import { GET as realtimeRoute } from "../../app/api/v1/realtime/stream/route";

describe("Neon staging safety boundary", () => {
  it("defaults to legacy mode and never invents Neon credentials", () => {
    expect(() => getNeonConfig({})).toThrow("requires neon-staging mode");
    expect(() => getNeonConfig({ MEROTALENT_BACKEND_MODE: "neon-staging" }))
      .toThrow("NEON_STAGING_DATABASE_URL is required");
  });

  it("refuses a Neon staging flag on Vercel production", () => {
    expect(() => getNeonConfig({
      MEROTALENT_BACKEND_MODE: "neon-staging",
      VERCEL_ENV: "production",
    })).toThrow("cannot run in a Vercel production deployment");
  });

  it("rejects a non-Neon target URL", () => {
    expect(() => getNeonConfig({
      MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_DATABASE_URL: "postgresql://user:pass@db.example.com/app",
      NEON_AUTH_BASE_URL: "https://example.com/auth",
      AWS_ENDPOINT_URL_S3: "https://example.com/storage",
      NEON_STAGING_BRANCH_ID: "br-example",
    })).toThrow("must point to Neon");
  });

  it("rejects a production-branch URL even when it is misnamed as staging", () => {
    expect(() => getNeonDatabaseConfig({
      MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: "br-frosty-haze-azsnybmr",
      NEON_STAGING_DATABASE_URL:
        "postgresql://user:pass@ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb",
    })).toThrow("do not match the approved isolated branch");
  });

  it("rejects a production Auth URL paired with the approved staging database", () => {
    expect(() => getNeonConfig({
      MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: "br-frosty-haze-azsnybmr",
      NEON_STAGING_DATABASE_URL:
        "postgresql://user:pass@ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb",
      NEON_AUTH_BASE_URL:
        "https://ep-polished-flower-azsezy8a.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth",
      AWS_ENDPOINT_URL_S3: "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech",
    })).toThrow("NEON_AUTH_BASE_URL does not match");
  });

  it("rejects a production storage endpoint paired with staging database and Auth", () => {
    expect(() => getNeonConfig({
      MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: "br-frosty-haze-azsnybmr",
      NEON_STAGING_DATABASE_URL:
        "postgresql://user:pass@ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb",
      NEON_AUTH_BASE_URL:
        "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth",
      AWS_ENDPOINT_URL_S3: "https://br-falling-breeze-azr6q64l.storage.c-3.ap-southeast-1.aws.neon.tech",
    })).toThrow("AWS_ENDPOINT_URL_S3 does not match");
  });

  it("rejects user queries until verified RLS is installed", async () => {
    const client = new NeonDatabaseClient();
    await expect(client.executeUserQuery({ userId: "synthetic-user" }, "select 1"))
      .rejects.toThrow("RLS parity is unverified");
    await expect(client.withTransaction({}, async () => "false success"))
      .rejects.toThrow("not enabled");
  });

  it("does not expose experimental auth or realtime endpoints in legacy mode", async () => {
    const previous = process.env.MEROTALENT_BACKEND_MODE;
    delete process.env.MEROTALENT_BACKEND_MODE;
    try {
      expect((await authRoute()).status).toBe(404);
      expect((await realtimeRoute()).status).toBe(404);
    } finally {
      if (previous === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
      else process.env.MEROTALENT_BACKEND_MODE = previous;
    }
  });

  it("reports unavailable instead of false success in staging mode", async () => {
    const previous = process.env.MEROTALENT_BACKEND_MODE;
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    try {
      expect((await authRoute()).status).toBe(503);
      expect((await realtimeRoute()).status).toBe(503);
    } finally {
      if (previous === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
      else process.env.MEROTALENT_BACKEND_MODE = previous;
    }
  });
});
