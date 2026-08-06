import { describe, expect, it } from "vitest";
import { getAdminResource } from "./admin-resources";
import {
  AdminRequestError,
  applyAdminServerFields,
  readAdminJsonBody,
} from "./admin-route-utils";

const adminId = "11111111-1111-4111-8111-111111111111";

describe("admin route server-owned fields", () => {
  it("records the approving admin and synchronizes published job state", () => {
    const payload = applyAdminServerFields(
      getAdminResource("jobs"),
      { status: "published" },
      adminId,
      "update",
    );

    expect(payload).toMatchObject({
      status: "published",
      approval_status: "approved",
      approved_by: adminId,
      rejection_reason: null,
      is_active: true,
    });
    expect(payload.approved_at).toEqual(expect.any(String));
  });

  it("sets immutable actor fields for created operational records", () => {
    expect(
      applyAdminServerFields(
        getAdminResource("user-permissions"),
        {},
        adminId,
        "create",
      ),
    ).toEqual({ granted_by: adminId });
    expect(
      applyAdminServerFields(
        getAdminResource("notifications"),
        {},
        adminId,
        "create",
      ),
    ).toEqual({ sender_id: adminId });
  });

  it("keeps approval and delivery state coherent", () => {
    expect(
      applyAdminServerFields(
        getAdminResource("events"),
        { status: "published" },
        adminId,
        "update",
      ),
    ).toMatchObject({
      approval_status: "approved",
      approved_by: adminId,
      is_active: true,
    });
    expect(
      applyAdminServerFields(
        getAdminResource("notifications"),
        { status: "read" },
        adminId,
        "update",
      ),
    ).toMatchObject({ status: "read", is_read: true, read_at: expect.any(String) });
  });

  it("clears stale approval metadata when returning content to review", () => {
    expect(
      applyAdminServerFields(
        getAdminResource("events"),
        { status: "pending_approval" },
        adminId,
        "update",
      ),
    ).toMatchObject({
      approval_status: "pending",
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      is_active: false,
    });
  });
});

describe("admin JSON body handling", () => {
  it("accepts JSON and rejects other media types", async () => {
    await expect(
      readAdminJsonBody(
        new Request("https://merotalent.test/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Safe" }),
        }),
      ),
    ).resolves.toEqual({ title: "Safe" });

    await expect(
      readAdminJsonBody(
        new Request("https://merotalent.test/api", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: "title=unsafe",
        }),
      ),
    ).rejects.toBeInstanceOf(AdminRequestError);
  });
});
