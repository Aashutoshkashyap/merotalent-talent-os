import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import { NeonRoleWorkspaces } from "@/lib/server/neon-role-workspaces";
import { NeonMentorsRepository } from "@/lib/server/neon-mentors";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";
import type { NeonActor } from "@/lib/server/neon-authorization";

describe("isolated Neon company and mentor operational workspaces", () => {
  it("uses assigned entities, protects expired private activity, saves review drafts, and rolls back every fixture", async () => {
    const parsed = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    if (!parsed.NEON_STAGING_DATABASE_URL) throw new Error("Isolated staging credentials are required.");
    Object.assign(process.env, parsed, { MEROTALENT_BACKEND_MODE: "neon-staging", NEON_STAGING_BRANCH_ID: NEON_MIGRATION_STAGING_BRANCH_ID });
    getNeonDatabaseConfig();
    const client = await getPool().connect();
    const generated: string[] = [];
    try {
      await client.query("BEGIN");
      const identity = (await client.query<{ legacy_user_id: string; neon_auth_user_id: string }>(`SELECT a.legacy_user_id,l.neon_auth_user_id
        FROM public.neon_identity_links l JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id WHERE l.status='verified' AND a.status='active'
          AND p.account_status='active' AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(identity).toBeDefined();
      const actor: NeonActor = { userId: identity.legacy_user_id, neonAuthUserId: identity.neon_auth_user_id,
        roles: ["talent"], permissions: [], platformAdmin: false };
      const run = <T>(operation: (connection: PoolClient) => Promise<T>) => operation(client);
      const query = <T extends QueryResultRow>(sql: string, params: readonly unknown[]) => client.query<T>(sql, [...params]).then(result => result.rows);
      const service = new NeonRoleWorkspaces(run);
      const capabilities: Record<string, string> = {};
      for (const moduleKey of ["jobs", "mentor", "events"]) {
        const cap = (await client.query<{ id: string }>(`SELECT id FROM public.module_capabilities WHERE module_key=$1 AND is_active LIMIT 1`, [moduleKey])).rows[0];
        expect(cap).toBeDefined();
        capabilities[moduleKey] = (await client.query<{ id: string }>(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status,expires_at)
          VALUES($1::uuid,$2::uuid,'active',NULL) ON CONFLICT(user_id,capability_id) DO UPDATE SET status='active',expires_at=NULL RETURNING id`,
        [actor.userId, cap.id])).rows[0].id;
      }
      const newProfile = async () => {
        const id = randomUUID();
        await client.query(`INSERT INTO public.profiles(user_id,email,full_name,account_status)
          VALUES($1::uuid,$2,'Isolated workspace fixture','active')`, [id, `workspace-${id}@example.invalid`]);
        return id;
      };
      const grant = async (moduleKey: string, entityType: string, entityId: string, features: Record<string, boolean>) => {
        await client.query(`INSERT INTO public.entity_admin_assignments(user_id,user_capability_id,entity_type,entity_id,status)
          VALUES($1::uuid,$2::uuid,$3,$4::uuid,'active')`, [actor.userId, capabilities[moduleKey], entityType, entityId]);
        return (await client.query<{ id: string }>(`INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,source,status,start_at,expires_at,features)
          VALUES($1::uuid,$2,$3,$4::uuid,'ADMIN_MANUAL','active',now()-interval '1 day',now()+interval '1 day',$5::jsonb) RETURNING id`,
        [actor.userId, moduleKey, entityType, entityId, JSON.stringify(features)])).rows[0].id;
      };
      const companies: string[] = [];
      for (let index = 0; index < 2; index++) {
        const id = (await client.query<{ id: string }>(`INSERT INTO public.companies(user_id,name) VALUES($1::uuid,$2) RETURNING id`,
        [await newProfile(), `Isolated managed company ${randomUUID()}`])).rows[0].id;
        companies.push(id); generated.push(id);
      }
      const companyEntitlement = await grant("jobs", "company", companies[0], { job_management: true, application_management: true });
      await grant("jobs", "company", companies[1], { job_management: true, application_management: true });
      const snapshot = await service.snapshot(actor, "company", companies[0]);
      expect(snapshot.locked).toBe(false);
      expect(snapshot.entityOptions.map(row => row.id)).toEqual(expect.arrayContaining(companies));
      expect((await service.snapshot(actor, "company", companies[1])).snapshot.company?.id).toBe(companies[1]);
      await expect(service.snapshot(actor, "company", randomUUID())).rejects.toMatchObject({ code: "WORKSPACE_SCOPE_DENIED" });
      await expect(service.snapshot({ ...actor, neonAuthUserId: randomUUID() }, "company", companies[0])).rejects.toMatchObject({ code: "ACCESS_DENIED" });
      const company = await service.save(actor, "company", { name: "Updated assigned company", description: "Real Neon workspace profile" }, companies[0]);
      expect(company).toMatchObject({ name: "Updated assigned company", description: "Real Neon workspace profile" });
      const job = await service.save(actor, "job", { company_id: companies[0], owner_user_id: actor.userId, title: "Assigned draft job", status: "pending_approval" });
      generated.push(String(job.id));
      expect(job).toMatchObject({ company_id: companies[0], status: "pending_approval", approval_status: "pending", is_active: false });
      await expect(service.save(actor, "job", { company_id: companies[1], status: "draft" }, String(job.id))).rejects.toMatchObject({ code: "SCOPE_REASSIGNMENT_DENIED" });
      const application = (await client.query<{ id: string }>(`INSERT INTO public.job_applications(job_id,user_id,full_name,email,status)
        VALUES($1::uuid,$2::uuid,'Isolated applicant','workspace-applicant@example.invalid','submitted') RETURNING id`, [job.id, actor.userId])).rows[0];
      expect(await service.applicants(actor, companies[0])).toContainEqual(expect.objectContaining({ id: application.id, job_title: "Assigned draft job" }));
      expect(await service.applicants(actor, companies[1])).not.toContainEqual(expect.objectContaining({ id: application.id }));
      const jobs = new NeonJobsRepository({ query });
      const reviewed = await jobs.reviewApplication(actor, { id: application.id, status: "screening" }, client);
      expect(reviewed.status).toBe("screening");
      await client.query(`UPDATE public.module_entitlements SET features='{"job_management":true,"lead_viewing":true}' WHERE id=$1::uuid`, [companyEntitlement]);
      await expect(jobs.reviewApplication(actor, { id: application.id, status: "offered" }, client)).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
      await client.query(`UPDATE public.module_entitlements SET expires_at=now()-interval '1 hour' WHERE id=$1::uuid`, [companyEntitlement]);
      const locked = await service.snapshot(actor, "company", companies[0]);
      expect(locked).toMatchObject({ locked: true, snapshot: { jobApplications: [], jobs: [], company: null } });
      await expect(service.applicants(actor, companies[0])).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
      await expect(service.save(actor, "job", { status: "draft" }, String(job.id))).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });

      const mentor = (await client.query<{ id: string }>(`INSERT INTO public.mentors(user_id,headline,approval_status)
        VALUES($1::uuid,'Assigned fixture mentor','approved') RETURNING id`, [await newProfile()])).rows[0];
      generated.push(mentor.id);
      const mentorEntitlement = await grant("mentor", "mentor", mentor.id, { profile_editing: true, session_management: true, booking_management: true });
      expect(await service.save(actor, "mentor", { availability: { days: ["Monday"], startTime: "09:00", endTime: "17:00", timezone: "Asia/Kathmandu" } }, mentor.id))
        .toMatchObject({ availability: { days: ["Monday"] } });
      await client.query(`UPDATE public.mentors SET availability='{}'::jsonb WHERE id=$1::uuid`, [mentor.id]);
      const offering = await service.save(actor, "mentor-service", { mentor_id: mentor.id, title: "Assigned mentoring", description: null,
        session_type: "one_to_one", duration_minutes: 60, capacity: 1, price: 0, currency: "NPR", is_active: true });
      expect(offering).toMatchObject({ mentor_id: mentor.id, is_active: true });
      const booking = (await client.query<{ id: string }>(`INSERT INTO public.mentor_bookings(mentor_id,mentor_service_id,student_id,scheduled_start,scheduled_end,status,payment_status,amount,currency)
        VALUES($1::uuid,$2::uuid,$3::uuid,now()-interval '2 hours',now()-interval '1 hour','confirmed','not_required',0,'NPR') RETURNING id`,
      [mentor.id, offering.id, actor.userId])).rows[0];
      expect((await service.snapshot(actor, "mentor", mentor.id)).snapshot.mentorBookings).toContainEqual(expect.objectContaining({ id: booking.id }));
      const mentors = new NeonMentorsRepository({ query });
      expect(await mentors.completeBooking(actor, booking.id, client)).toMatchObject({ status: "completed" });
      expect(await service.transition(actor, "mentor_booking", booking.id, "completed")).toMatchObject({ duplicate: true });
      await client.query(`UPDATE public.module_entitlements SET expires_at=now()-interval '1 hour' WHERE id=$1::uuid`, [mentorEntitlement]);
      await expect(mentors.completeBooking(actor, booking.id, client)).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });

      const event = (await client.query<{ id: string }>(`INSERT INTO public.events(organizer_user_id,organizer_type,organizer_id,title,start_date,end_date,status)
        VALUES($1::uuid,'mentor',$2::uuid,'Assigned event',now()+interval '1 day',now()+interval '2 days','draft') RETURNING id`, [actor.userId, mentor.id])).rows[0];
      generated.push(event.id);
      const eventEntitlement = await grant("events", "event", event.id, { event_management: true, registration_management: true });
      await client.query(`UPDATE public.user_module_capabilities SET status='revoked' WHERE id=ANY($1::uuid[])`, [[capabilities.jobs, capabilities.mentor]]);
      expect(await service.events(actor, event.id)).toMatchObject({ locked: false, entityId: event.id,
        capabilities: { profile: true, registrations: true, registrationManagement: true } });
      expect(await service.save(actor, "event", { title: "Assigned revised event", status: "pending_approval" }, event.id))
        .toMatchObject({ status: "pending_approval", approval_status: "pending", is_active: false });
      const attendee = (await client.query<{ id: string }>(`INSERT INTO public.event_registrations(event_id,user_id,status,payment_status,ticket_quantity,total_amount)
        VALUES($1::uuid,$2::uuid,'pending','pending',1,500) RETURNING id`, [event.id, actor.userId])).rows[0];
      await expect(service.transition(actor, "event_registration", attendee.id, "confirmed")).rejects.toMatchObject({ code: "PAYMENT_NOT_VERIFIED" });
      expect(await service.transition(actor, "event_registration", attendee.id, "cancelled")).toMatchObject({ status: "cancelled" });
      expect(await service.events(actor, event.id)).toMatchObject({ snapshot: { eventRegistrations: [expect.objectContaining({ id: attendee.id, status: "cancelled" })] } });
      await client.query(`UPDATE public.module_entitlements SET expires_at=now()-interval '1 hour' WHERE id=$1::uuid`, [eventEntitlement]);
      expect(await service.events(actor, event.id)).toMatchObject({ locked: true, snapshot: { eventRegistrations: [], events: [] } });
      const events = await client.query(`SELECT id FROM public.neon_application_events WHERE recipient_user_id=$1::uuid`, [actor.userId]);
      expect(events.rowCount).toBeGreaterThan(0);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      if (generated.length) {
        const remaining = await client.query<{ count: number }>(`SELECT (SELECT count(*) FROM public.jobs WHERE id=ANY($1::uuid[]))+
          (SELECT count(*) FROM public.companies WHERE id=ANY($1::uuid[]))+(SELECT count(*) FROM public.mentors WHERE id=ANY($1::uuid[]))+
          (SELECT count(*) FROM public.events WHERE id=ANY($1::uuid[])) AS count`, [generated]);
        expect(Number(remaining.rows[0].count)).toBe(0);
      }
      client.release(); await getPool().end();
    }
  }, 120000);
});
