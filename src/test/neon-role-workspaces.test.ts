import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { NeonRoleWorkspaces } from "@/lib/server/neon-role-workspaces";
import { NeonMentorsRepository } from "@/lib/server/neon-mentors";
import type { NeonActor } from "@/lib/server/neon-authorization";

const actor: NeonActor = { userId: "10000000-0000-4000-8000-000000000001", neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  platformAdmin: false, roles: ["talent"], permissions: [] };
const entityId = "30000000-0000-4000-8000-000000000003";
const otherId = "40000000-0000-4000-8000-000000000004";
const recordId = "50000000-0000-4000-8000-000000000005";

function fixture(options: { features?: string[]; capability?: boolean; linked?: boolean; record?: Record<string, unknown>; assigned?: string[] } = {}) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const features = options.features ?? ["job_management", "profile_editing", "session_management", "booking_management", "application_management", "registration_management", "event_management"];
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    let rows: Record<string, unknown>[] = [];
    if (sql.includes("FOR SHARE OF p,a,l")) rows = options.linked === false ? [] : [{ admin: false }];
    else if (sql.includes("SELECT EXISTS") && sql.includes("AS allowed")) rows = [{ allowed: options.capability !== false && (!values[4] || features.includes(String(values[4]))) }];
    else if (sql.includes("SELECT DISTINCT e.id")) rows = (options.assigned ?? [entityId, otherId]).map(id => ({ id, label: `Assigned ${id}` }));
    else if (sql.includes("SELECT e.status")) rows = [{ status: "active", source: "ADMIN_COMP", expires_at: new Date(Date.now() + 86400000), features: Object.fromEntries(features.map(key => [key, true])) }];
    else if (sql.includes("SELECT e.*")) rows = [{ id: values[0], name: "Assigned company", approval_status: "approved" }];
    else if (sql.includes("FOR UPDATE") && (sql.includes("mentor_bookings") || sql.includes("mentor_services") || sql.includes("public.jobs") || sql.includes("SELECT * FROM public.mentors"))) rows = [options.record ?? { id: recordId, company_id: entityId, mentor_id: entityId, student_id: otherId, status: "pending", payment_status: "pending" }];
    else if (sql.includes("SELECT * FROM public.events WHERE id")) rows = [{ id: values[0], title: "Assigned event", organizer_type: "mentor", organizer_id: otherId }];
    else if (sql.includes("SELECT * FROM public.events")) rows = [];
    else if (sql.includes("INSERT INTO public.notifications")) rows = [{ id: recordId }];
    else if (sql.includes("RETURNING")) rows = [{ id: recordId, status: values[1], company_id: entityId }];
    return { rows, rowCount: rows.length };
  });
  const client = { query } as unknown as PoolClient;
  const service = new NeonRoleWorkspaces(operation => operation(client));
  return { service, client, calls };
}

describe("scoped Neon operational workspaces", () => {
  it("denies ticket configuration after entitlement expiry and refuses forged tier fields",async()=>{
    await expect(fixture({capability:false}).service.ticketConfiguration(actor,entityId)).rejects.toMatchObject({code:"MODULE_CAPABILITY_REQUIRED"});
    await expect(fixture({features:["lead_viewing"]}).service.ticketConfiguration(actor,entityId)).rejects.toMatchObject({code:"ENTITY_ACCESS_REQUIRED"});
    await expect(fixture().service.ticketConfiguration(actor,entityId,{name:"Forged",quantity_sold:999})).rejects.toThrow();
  });
  it("returns multiple assigned company choices and scopes each snapshot to the requested company", async () => {
    const { service, calls } = fixture();
    const result = await service.snapshot(actor, "company", otherId);
    expect(result.entityId).toBe(otherId);
    expect(result.entityOptions).toHaveLength(2);
    expect(calls.filter(call => call.sql.includes("FROM public.jobs WHERE company_id"))).toEqual([
      expect.objectContaining({ values: [otherId] }),
    ]);
    await expect(service.snapshot(actor, "company", recordId)).rejects.toMatchObject({ code: "WORKSPACE_SCOPE_DENIED" });
  });
  it("returns a locked empty workspace after access expires without querying private leads", async () => {
    const { service, calls } = fixture({ capability: false });
    const result = await service.snapshot(actor, "company", entityId);
    expect(result.locked).toBe(true);
    expect(result.snapshot.jobApplications).toEqual([]);
    expect(calls.some(call => call.sql.includes("FROM public.job_applications"))).toBe(false);
  });
  it("opens an event-only assigned workspace without depending on company or mentor ownership", async () => {
    const { service, calls } = fixture({ features: ["event_management", "registration_management"] });
    const result = await service.events(actor, entityId);
    expect(result).toMatchObject({ entityId, locked: false, capabilities: { profile: true, registrations: true, registrationManagement: true } });
    expect(result.snapshot.events).toContainEqual(expect.objectContaining({ id: entityId }));
    expect(calls.some(call => call.sql.includes("FROM public.companies") || call.sql.includes("FROM public.mentors"))).toBe(false);
    await expect(service.events(actor, recordId)).rejects.toMatchObject({ code: "WORKSPACE_SCOPE_DENIED" });
    const locked = await fixture({ capability: false }).service.events(actor, entityId);
    expect(locked).toMatchObject({ locked: true, snapshot: { events: [], eventRegistrations: [] } });
  });
  it("rejects identity loss, invalid scopes, protected fields and publication bypasses", async () => {
    await expect(fixture({ linked: false }).service.snapshot(actor, "mentor")).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(fixture().service.snapshot(actor, "company", "invalid")).rejects.toMatchObject({ code: "INVALID_WORKSPACE" });
    await expect(fixture().service.save(actor, "job", { is_active: true })).rejects.toMatchObject({ code: "PROTECTED_FIELD" });
    await expect(fixture().service.save(actor, "job", { company_id: entityId, owner_user_id: actor.userId, title: "Job", status: "published" }))
      .rejects.toMatchObject({ code: "ADMIN_APPROVAL_REQUIRED" });
  });
  it("locks the relevant grants before saving a draft and never changes company ownership", async () => {
    const { service, calls } = fixture();
    await service.save(actor, "job", { company_id: entityId, owner_user_id: actor.userId, title: "Job", status: "draft" });
    const access = calls.findIndex(call => call.sql.includes("AS allowed") && call.values[4] === "job_management");
    expect(calls.slice(0, access).some(call => call.sql.includes("module_entitlements") && call.sql.includes("FOR SHARE"))).toBe(true);
    const inserted = calls.find(call => call.sql.includes("INSERT INTO public.jobs"))!;
    expect(inserted.sql).toContain('"approval_status"');
    expect(inserted.values).toContain("pending");
    expect(inserted.values).toContain(false);
    await expect(service.save(actor, "job", { company_id: otherId, status: "draft" }, recordId)).rejects.toMatchObject({ code: "SCOPE_REASSIGNMENT_DENIED" });
  });
  it("accepts existing management aliases for reads while refusing lead-only status mutations", async () => {
    const readOnly = fixture({ features: ["lead_viewing"] });
    await expect(readOnly.service.applicants(actor, entityId)).resolves.toEqual([]);
    await expect(readOnly.service.transition(actor, "mentor_booking", recordId, "cancelled")).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
    expect(readOnly.calls.some(call => call.sql.startsWith("UPDATE"))).toBe(false);
  });
  it("denies unpaid confirmation and repeated status changes create no second notification", async () => {
    const pending = fixture();
    await expect(pending.service.transition(actor, "mentor_booking", recordId, "confirmed")).rejects.toMatchObject({ code: "PAYMENT_NOT_VERIFIED" });
    const duplicate = fixture({ record: { id: recordId, mentor_id: entityId, student_id: otherId, status: "completed", payment_status: "success" } });
    expect(await duplicate.service.transition(actor, "mentor_booking", recordId, "completed")).toMatchObject({ duplicate: true });
    expect(duplicate.calls.some(call => call.sql.includes("INSERT INTO public.notifications"))).toBe(false);
  });
  it("enforces group capacity and valid mentor availability on the server", async () => {
    await expect(fixture().service.save(actor, "mentor-service", { mentor_id: entityId, title: "Session", description: null,
      session_type: "one_to_one", duration_minutes: 60, capacity: 2, price: 0, currency: "NPR", is_active: true }))
      .rejects.toMatchObject({ code: "INVALID_CAPACITY" });
    await expect(fixture().service.save(actor, "mentor", { availability: { days: ["Monday"], startTime: "17:00", endTime: "09:00", timezone: "Asia/Kathmandu" } }, recordId))
      .rejects.toMatchObject({ code: "INVALID_AVAILABILITY" });
  });
});

describe("Neon mentor owner actions", () => {
  it("requires scoped entitlement even when the actor is the original mentor owner", async () => {
    const { client, calls } = fixture({ capability: false, record: { id: recordId, mentor_id: entityId,
      student_id: otherId, mentor_user_id: actor.userId, status: "pending", payment_status: "pending", duration_minutes: 60 } });
    const repo = new NeonMentorsRepository();
    const start = new Date(Date.now() + 86400000).toISOString();
    await expect(repo.rescheduleBooking(actor, recordId, start, new Date(Date.parse(start) + 3600000).toISOString(), "", client))
      .rejects.toMatchObject({ code: "MODULE_CAPABILITY_REQUIRED" });
    await expect(repo.cancelBooking(actor, recordId, "", client)).rejects.toMatchObject({ code: "MODULE_CAPABILITY_REQUIRED" });
    await expect(repo.completeBooking(actor, recordId, client)).rejects.toMatchObject({ code: "MODULE_CAPABILITY_REQUIRED" });
    expect(calls.some(call => call.sql.trim().startsWith("UPDATE"))).toBe(false);
  });
});
