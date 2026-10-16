import { beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";

const queryRowsMock = vi.hoisted(() => vi.fn());
const actorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/server/db", () => ({ queryRows: queryRowsMock }));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: actorMock,
}));

import { GET } from "../../app/api/v1/neon-staging/student-activity/route";

const userId = "4da2dbaa-e1c6-4c29-88ce-6716761985d1";
const actor = { userId, neonAuthUserId: "f37ca3df-fb76-4107-802b-03feec324620",
  roles: ["talent"], permissions: [], platformAdmin: false };
const request = () => new Request("http://localhost/api/v1/neon-staging/student-activity?userId=someone-else");

describe("Neon student activity", () => {
  beforeEach(() => { actorMock.mockReset(); queryRowsMock.mockReset(); actorMock.mockResolvedValue(actor); });

  it("returns only the session-linked user's four module histories", async () => {
    queryRowsMock.mockResolvedValueOnce([{ id: "college-1", institute_id: "institute-1",
      institute_name: "College A", status: "submitted", submitted_at: new Date("2026-10-01T00:00:00Z") }]);
    queryRowsMock.mockResolvedValueOnce([{ id: "application-1", job_id: "job-1", job_title: "Engineer",
      company_name: "Employer A", status: "screening", applied_at: new Date("2026-10-02T00:00:00Z") }]);
    queryRowsMock.mockResolvedValueOnce([{ id: "registration-1", event_id: "event-1", event_title: "Contest",
      status: "confirmed", payment_status: "success", ticket_quantity: 2,
      total_amount: "200.00", registered_at: new Date("2026-10-03T00:00:00Z") }]);
    queryRowsMock.mockResolvedValueOnce([{ id: "booking-1", mentor_id: "mentor-1", mentor_name: "Mentor A",
      expertise: ["Engineering"], service_title: "Career advice", scheduled_start: new Date("2026-10-04T01:00:00Z"),
      scheduled_end: new Date("2026-10-04T02:00:00Z"), status: "confirmed", payment_status: "success",
      amount: "100.00", currency: "NPR", form_data: { topic: "Careers" }, created_at: new Date("2026-10-03T01:00:00Z") }]);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body = (await response.json()).data;
    expect(body.collegeApplications[0].instituteName).toBe("College A");
    expect(body.jobApplications[0].companyName).toBe("Employer A");
    expect(body.eventRegistrations[0].totalAmount).toBe(200);
    expect(body.mentorBookings[0].topic).toBe("Careers");
    expect(queryRowsMock).toHaveBeenCalledTimes(4);
    for (const [sql, params] of queryRowsMock.mock.calls) {
      expect(sql).toContain("$1::uuid");
      expect(sql).toContain("deleted_at IS NULL");
      expect(params).toEqual([userId]);
    }
  });

  it("rejects unlinked sessions and never queries private activity", async () => {
    actorMock.mockRejectedValueOnce(new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "Unlinked"));
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(queryRowsMock).not.toHaveBeenCalled();
  });

  it("does not claim an empty history when a database query fails", async () => {
    queryRowsMock.mockRejectedValueOnce(new Error("database unavailable"));
    const response = await GET(request());
    expect(response.status).toBe(503);
  });
});
