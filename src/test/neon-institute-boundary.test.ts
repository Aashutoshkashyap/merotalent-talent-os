import { afterEach, describe, expect, it } from "vitest";
import { GET, PATCH } from "../../app/api/v1/institutes/[id]/route";
import { getAuthenticatedApplicationUser, managedSessionVerifier } from "@/lib/server/neon-session";

const original = {
  mode: process.env.MEROTALENT_BACKEND_MODE,
  url: process.env.NEON_STAGING_DATABASE_URL,
  branch: process.env.NEON_STAGING_BRANCH_ID,
  auth: process.env.NEON_AUTH_BASE_URL,
};
const id = "01e38067-3919-4cee-8a7d-46025626e928";
const params = { params: Promise.resolve({ id }) };

function staging() {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  process.env.NEON_STAGING_DATABASE_URL = "postgresql://staging:unused@ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb";
  process.env.NEON_STAGING_BRANCH_ID = "br-frosty-haze-azsnybmr";
  process.env.NEON_AUTH_BASE_URL = "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";
}

afterEach(() => {
  if (original.mode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = original.mode;
  if (original.url === undefined) delete process.env.NEON_STAGING_DATABASE_URL;
  else process.env.NEON_STAGING_DATABASE_URL = original.url;
  if (original.branch === undefined) delete process.env.NEON_STAGING_BRANCH_ID;
  else process.env.NEON_STAGING_BRANCH_ID = original.branch;
  if (original.auth === undefined) delete process.env.NEON_AUTH_BASE_URL;
  else process.env.NEON_AUTH_BASE_URL = original.auth;
});

describe("Neon institute HTTP boundary", () => {
  it("requires a session for a protected institute read or update", async () => {
    staging();
    const read = await GET(new Request(`https://staging.test/api/v1/institutes/${id}?view=managed`), params);
    expect(read.status).toBe(401);
    const write = await PATCH(new Request(`https://staging.test/api/v1/institutes/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Changed" }),
    }), params);
    expect(write.status).toBe(401);
  });

  it("rejects malformed IDs and undeclared fields before touching the database", async () => {
    staging();
    const invalid = await GET(new Request("https://staging.test/api/v1/institutes/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(invalid.status).toBe(400);
    const extra = await PATCH(new Request(`https://staging.test/api/v1/institutes/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Valid", status: "approved" }),
    }), params);
    expect(extra.status).toBe(400);
  });

  it("does not accept a caller-supplied identity as a session", async () => {
    staging();
    const request = new Request(`https://staging.test/api/v1/institutes/${id}`, {
      headers: { "x-user-id": id, authorization: `Bearer ${id}` },
    });
    await expect(getAuthenticatedApplicationUser(request)).rejects.toMatchObject({ status: 401 });
    expect(await managedSessionVerifier.verify(request)).toBeNull();
  });
});
