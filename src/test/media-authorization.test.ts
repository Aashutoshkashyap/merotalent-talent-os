import { describe, expect, it, vi } from "vitest";

import {
  authorizeMediaAccess,
  claimMediaUploadIntent,
} from "@/lib/server/media-authorization";
import { MediaPolicyError } from "@/lib/server/media-policy";

const resourceId = "95920411-b7dd-48c7-95d4-a3fba9cd7f75";
const ownerId = "a70c51ac-e25e-42fd-b596-a2972836ca9e";

describe("authorizeMediaAccess", () => {
  it("passes the validated object owner to the auth-bound database RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });

    await expect(
      authorizeMediaAccess(
        { rpc } as never,
        "application_file",
        resourceId,
        "download",
        ownerId,
      ),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("authorize_media_access", {
      p_action: "download",
      p_module: "application_file",
      p_owner_user_id: ownerId,
      p_resource_id: resourceId,
    });
  });

  it("fails closed when the database denies resource ownership", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });

    await expect(
      authorizeMediaAccess(
        { rpc } as never,
        "application_file",
        resourceId,
        "download",
        ownerId,
      ),
    ).rejects.toBeInstanceOf(MediaPolicyError);
  });
});

describe("claimMediaUploadIntent", () => {
  it("claims a database-backed upload slot with the canonical object path", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const path = `${ownerId}/job_attachment/${resourceId}/150c3fb5-a401-4d24-9527-2d6e577fb716.pdf`;

    await expect(
      claimMediaUploadIntent(
        { rpc } as never,
        "job_attachment",
        resourceId,
        path,
        512_000,
      ),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("claim_media_upload_intent", {
      p_module: "job_attachment",
      p_object_path: path,
      p_resource_id: resourceId,
      p_declared_size: 512_000,
    });
  });

  it("returns a typed rate limit error when the database quota is exhausted", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });

    await expect(
      claimMediaUploadIntent(
        { rpc } as never,
        "job_attachment",
        resourceId,
        `${ownerId}/job_attachment/${resourceId}/150c3fb5-a401-4d24-9527-2d6e577fb716.pdf`,
        512_000,
      ),
    ).rejects.toMatchObject({ status: 429, code: "MEDIA_RATE_LIMITED" });
  });
});
