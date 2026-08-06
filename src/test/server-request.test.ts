import { describe, expect, it } from "vitest";

import { ApiRequestError, readJsonObject } from "@/lib/server/request";

describe("readJsonObject", () => {
  it("accepts a bounded JSON object", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: "resume" }),
    });
    await expect(readJsonObject(request, 1024)).resolves.toEqual({
      module: "resume",
    });
  });

  it("rejects non-JSON and non-object payloads", async () => {
    await expect(
      readJsonObject(
        new Request("https://example.test", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: "hello",
        }),
      ),
    ).rejects.toBeInstanceOf(ApiRequestError);

    await expect(
      readJsonObject(
        new Request("https://example.test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "[]",
        }),
      ),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});
