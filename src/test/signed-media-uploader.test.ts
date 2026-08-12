import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getPublicUrl: vi.fn(),
  uploadToSignedUrl: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: storageMocks.getSession },
    storage: { from: storageMocks.from },
  },
}));

import { uploadSignedCollegeMedia } from "@/components/media/SignedMediaUploader";

const resourceId = "95920411-b7dd-48c7-95d4-a3fba9cd7f75";
const objectPath =
  "a70c51ac-e25e-42fd-b596-a2972836ca9e/college_logo/95920411-b7dd-48c7-95d4-a3fba9cd7f75/150c3fb5-a401-4d24-9527-2d6e577fb716.png";

describe("signed college media upload client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "user-access-token" } },
      error: null,
    });
    storageMocks.uploadToSignedUrl.mockResolvedValue({ data: { path: objectPath }, error: null });
    storageMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: `https://storage.example/college-media/${objectPath}` },
    });
    storageMocks.from.mockReturnValue({
      uploadToSignedUrl: storageMocks.uploadToSignedUrl,
      getPublicUrl: storageMocks.getPublicUrl,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the user bearer token to sign, then the one-time token to upload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            bucket: "college-media",
            path: objectPath,
            token: "one-time-upload-token",
          },
          error: null,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    const file = new File(["png-content"], "logo.png", { type: "image/png" });

    await expect(
      uploadSignedCollegeMedia(file, "college_logo", resourceId),
    ).resolves.toEqual({
      bucket: "college-media",
      path: objectPath,
      publicUrl: `https://storage.example/college-media/${objectPath}`,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/media/upload-url",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer user-access-token" }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      module: "college_logo",
      resourceId,
      fileName: "logo.png",
      contentType: "image/png",
      sizeBytes: file.size,
    });
    expect(storageMocks.uploadToSignedUrl).toHaveBeenCalledWith(
      objectPath,
      "one-time-upload-token",
      file,
      expect.objectContaining({ contentType: "image/png", upsert: false }),
    );
  });

  it("rejects a signed destination outside the public college bucket", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            bucket: "application-files",
            path: objectPath,
            token: "one-time-upload-token",
          },
          error: null,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      uploadSignedCollegeMedia(
        new File(["png-content"], "logo.png", { type: "image/png" }),
        "college_logo",
        resourceId,
      ),
    ).rejects.toThrow("invalid destination");
    expect(storageMocks.from).not.toHaveBeenCalled();
    expect(storageMocks.uploadToSignedUrl).not.toHaveBeenCalled();
    expect(storageMocks.getPublicUrl).not.toHaveBeenCalled();
  });

  it("fails closed when signing is unavailable instead of switching buckets", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ data: null, error: { message: "Upload authorization failed." } }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      uploadSignedCollegeMedia(
        new File(["png-content"], "logo.png", { type: "image/png" }),
        "college_logo",
        resourceId,
      ),
    ).rejects.toThrow("Upload authorization failed");

    expect(storageMocks.from).not.toHaveBeenCalled();
    expect(storageMocks.uploadToSignedUrl).not.toHaveBeenCalled();
  });

  it("requires an authenticated session before requesting an upload", async () => {
    storageMocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      uploadSignedCollegeMedia(
        new File(["png-content"], "logo.png", { type: "image/png" }),
        "college_logo",
        resourceId,
      ),
    ).rejects.toThrow("Sign in again");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(storageMocks.from).not.toHaveBeenCalled();
  });
});
