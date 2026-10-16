import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { getNeonConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import { publicObjectUrl } from "@/lib/server/application-storage";
import { deleteObject, headObject, uploadObject } from "@/lib/server/storage";

describe("isolated Neon college-media object lifecycle", () => {
  it("uploads, signs a public read, and removes only its temporary staging object", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL || !parsed.AWS_ENDPOINT_URL_S3) {
      throw new Error("Isolated Neon staging credentials are required.");
    }
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging",
      NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonConfig();
    const owner = randomUUID();
    const college = randomUUID();
    const path = `${owner}/college_logo/${college}/${randomUUID()}.png`;
    const bytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
    try {
      expect(await headObject("college-media", path)).toBeNull();
      await uploadObject("college-media", path, bytes, "image/png");
      expect(await headObject("college-media", path)).toMatchObject({ contentType: "image/png", contentLength: bytes.length });
      const signed = await publicObjectUrl("college_logo", path);
      const response = await fetch(signed);
      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    } finally {
      await deleteObject("college-media", path);
    }
    expect(await headObject("college-media", path)).toBeNull();
  }, 60_000);
});
