import { describe, expect, it } from "vitest";

import { POST as createDownloadUrl } from "../../app/api/v1/media/download-url/route";
import { POST as createUploadUrl } from "../../app/api/v1/media/upload-url/route";

const unauthenticatedRequest = () =>
  new Request("https://example.test/api/v1/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

describe("media signing routes", () => {
  it("fails upload signing closed without a bearer token", async () => {
    const response = await createUploadUrl(unauthenticatedRequest());
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      data: null,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("fails download signing closed without a bearer token", async () => {
    const response = await createDownloadUrl(unauthenticatedRequest());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      data: null,
      error: { code: "AUTH_REQUIRED" },
    });
  });
});
