import { describe, expect, it } from "vitest";
import {
  getAdminResource,
  isAdminResourceName,
} from "./admin-resources";
import {
  AdminResourceValidationError,
  parseAdminListQuery,
  sanitizeAdminWrite,
  validateAdminResourceId,
} from "./admin-resource-service";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("admin resource registry", () => {
  it("maps UI-compatible colleges and partnered course storage explicitly", () => {
    expect(getAdminResource("colleges").table).toBe("institutes");
    expect(getAdminResource("partnered-courses").table).toBe("courses");
    expect(getAdminResource("partnered-courses").scope).toEqual({
      is_partnered: true,
    });
    expect(isAdminResourceName("payments;drop table users")).toBe(false);
  });

  it("exposes only safe profile data for users", () => {
    const users = getAdminResource("users");
    expect(users.select).toContain("account_status");
    expect(users.select).not.toMatch(/password|token|encrypted/i);
    expect(users.creatable).toBe(false);
    expect(users.deletable).toBe(false);
    expect(users.fields.account_status.update).toBe(false);
  });

  it("exposes generated submissions and leads as controlled admin resources", () => {
    for (const resource of [
      "college-applications",
      "mentor-bookings",
      "job-applications",
      "event-registrations",
      "leads",
    ] as const) {
      const definition = getAdminResource(resource);
      expect(definition.creatable).toBe(false);
      expect(definition.softDelete).toBeDefined();
      expect(definition.fields.status.update).toBe(true);
    }
  });
});

describe("admin list query parsing", () => {
  it("parses whitelisted pagination, sorting and filters", () => {
    const parsed = parseAdminListQuery(
      getAdminResource("jobs"),
      new URLSearchParams({
        page: "2",
        page_size: "20",
        sort_by: "application_deadline",
        sort_direction: "asc",
        is_active: "true",
      }),
    );

    expect(parsed).toMatchObject({
      page: 2,
      pageSize: 20,
      offset: 20,
      sortBy: "application_deadline",
      ascending: true,
      filters: { is_active: true },
    });
  });

  it("rejects arbitrary columns, filters and oversized pages", () => {
    expect(() =>
      parseAdminListQuery(
        getAdminResource("jobs"),
        new URLSearchParams("sort_by=private_column"),
      ),
    ).toThrow(AdminResourceValidationError);
    expect(() =>
      parseAdminListQuery(
        getAdminResource("jobs"),
        new URLSearchParams("owner_user_id=eq.admin&select=*"),
      ),
    ).toThrow(AdminResourceValidationError);
    expect(() =>
      parseAdminListQuery(
        getAdminResource("jobs"),
        new URLSearchParams("page_size=101"),
      ),
    ).toThrow(AdminResourceValidationError);
    expect(() =>
      parseAdminListQuery(
        getAdminResource("jobs"),
        new URLSearchParams("page=10001"),
      ),
    ).toThrow(AdminResourceValidationError);
  });
});

describe("admin write validation", () => {
  it("accepts and normalizes a whitelisted role assignment", () => {
    expect(
      sanitizeAdminWrite(getAdminResource("user-roles"), "create", {
        user_id: uuid,
        role: "mentor",
      }),
    ).toEqual({ user_id: uuid, role: "mentor" });
  });

  it("rejects privilege fields, unknown fields and invalid role values", () => {
    expect(() =>
      sanitizeAdminWrite(getAdminResource("users"), "update", {
        account_status: "deactivated",
      }),
    ).toThrow(AdminResourceValidationError);
    expect(() =>
      sanitizeAdminWrite(getAdminResource("notifications"), "create", {
        recipient_id: uuid,
        title: "Update",
        message: "Your application changed.",
        sender_id: uuid,
      }),
    ).toThrow(AdminResourceValidationError);
    expect(() =>
      sanitizeAdminWrite(getAdminResource("user-roles"), "create", {
        user_id: uuid,
        role: "root",
      }),
    ).toThrow(AdminResourceValidationError);
    expect(() =>
      sanitizeAdminWrite(getAdminResource("payments"), "update", {
        amount: 0,
      }),
    ).toThrow(AdminResourceValidationError);
  });

  it("requires UUID record identifiers", () => {
    expect(validateAdminResourceId(uuid)).toBe(uuid);
    expect(() => validateAdminResourceId("id.eq.anything")).toThrow(
      AdminResourceValidationError,
    );
  });

  it("allows partnered course redirects only on the HTTPS learning host", () => {
    const base = {
      title: "Product Design",
    };
    expect(
      sanitizeAdminWrite(getAdminResource("partnered-courses"), "create", {
        ...base,
        redirect_url: "https://learn.merotalent.com/courses/product-design",
      }).redirect_url,
    ).toBe("https://learn.merotalent.com/courses/product-design");
    expect(() =>
      sanitizeAdminWrite(getAdminResource("partnered-courses"), "create", {
        ...base,
        redirect_url: "https://evil.example/courses/product-design",
      }),
    ).toThrow(AdminResourceValidationError);
    expect(() =>
      sanitizeAdminWrite(getAdminResource("partnered-courses"), "create", {
        ...base,
        redirect_url: "http://learn.merotalent.com/courses/product-design",
      }),
    ).toThrow(AdminResourceValidationError);
  });
});
