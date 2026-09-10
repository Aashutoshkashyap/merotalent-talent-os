import { describe, expect, it } from "vitest";

import { GET as getAdminResource } from "../../app/api/v1/admin/[resource]/route";
import { GET as getAdminResourceItem } from "../../app/api/v1/admin/[resource]/[id]/route";
import { POST as mutatePermissionCatalog } from "../../app/api/v1/admin/permissions/route";
import { GET as getAdminReport } from "../../app/api/v1/admin/reports/[report]/route";
import { GET as getProviderStatus } from "../../app/api/v1/admin/provider-status/route";
import { POST as submitModuleForm } from "../../app/api/v1/submissions/[module]/route";

const expectAuthRequired = async (response: Response) => {
  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    data: null,
    error: { code: "AUTH_REQUIRED" },
  });
};

describe("API authentication order", () => {
  it("authenticates before resolving an unknown admin resource", async () => {
    await expectAuthRequired(
      await getAdminResource(
        new Request("https://merotalent.test/api/v1/admin/not-a-resource"),
        { params: Promise.resolve({ resource: "not-a-resource" }) },
      ),
    );
  });

  it("authenticates before validating an admin item identifier", async () => {
    await expectAuthRequired(
      await getAdminResourceItem(
        new Request("https://merotalent.test/api/v1/admin/jobs/not-a-uuid"),
        {
          params: Promise.resolve({
            resource: "jobs",
            id: "not-a-uuid",
          }),
        },
      ),
    );
  });

  it("authenticates before rejecting permission-catalog writes", async () => {
    await expectAuthRequired(
      await mutatePermissionCatalog(
        new Request("https://merotalent.test/api/v1/admin/permissions", {
          method: "POST",
        }),
      ),
    );
  });

  it("authenticates before resolving an unknown report", async () => {
    await expectAuthRequired(
      await getAdminReport(
        new Request("https://merotalent.test/api/v1/admin/reports/not-a-report"),
        { params: Promise.resolve({ report: "not-a-report" }) },
      ),
    );
  });

  it("authenticates before exposing provider state", async () => {
    await expectAuthRequired(
      await getProviderStatus(
        new Request("https://merotalent.test/api/v1/admin/provider-status"),
      ),
    );
  });

  it("authenticates before resolving an unknown submission module", async () => {
    await expectAuthRequired(
      await submitModuleForm(
        new Request("https://merotalent.test/api/v1/submissions/not-a-module", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
        { params: Promise.resolve({ module: "not-a-module" }) },
      ),
    );
  });
});
