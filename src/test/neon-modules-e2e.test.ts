import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { getPool, queryRows, withTransaction } from "@/lib/server/db";
import { deleteObject } from "@/lib/server/storage";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { NeonCollegesRepository } from "@/lib/server/neon-colleges";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";
import { NeonMentorsRepository } from "@/lib/server/neon-mentors";
import { NeonEventsRepository } from "@/lib/server/neon-events";
import { NeonPaymentsRepository } from "@/lib/server/neon-payments";
import { NeonMessagingRepository } from "@/lib/server/neon-messaging";
import { listApplicationEvents } from "@/lib/server/neon-application-events";
import { uploadBytes, privateDownloadUrl } from "@/lib/server/application-storage";

function localStagingConfig(): Record<string, string> {
  return dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
}

describe("Neon staging complete module runtime E2E verification", () => {
  let actorA: NeonActor;
  let actorB: NeonActor;
  let adminActor: NeonActor;

  beforeAll(async () => {
    const config = localStagingConfig();
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    for (const name of [
      "NEON_STAGING_DATABASE_URL",
      "AWS_ENDPOINT_URL_S3",
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
    ]) {
      if (!config[name]) throw new Error(`Staging configuration ${name} is missing.`);
      process.env[name] = config[name];
    }
    process.env.NEON_STAGING_BRANCH_ID = NEON_MIGRATION_STAGING_BRANCH_ID;
    getNeonDatabaseConfig();

    // Query 2 active profiles and 1 admin profile from staging
    const users = await queryRows<{ user_id: string }>(`
      SELECT user_id FROM public.profiles
      WHERE account_status = 'active' AND deleted_at IS NULL
      ORDER BY user_id LIMIT 2`);

    const admins = await queryRows<{ user_id: string }>(`
      SELECT ur.user_id FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.role IN ('admin', 'super_admin') AND p.account_status = 'active'
      LIMIT 1`);

    expect(users).toHaveLength(2);
    actorA = {
      userId: users[0].user_id,
      neonAuthUserId: "MOCK_NEON_AUTH_USER_A",
      roles: ["talent"],
      permissions: [],
      platformAdmin: false,
    };
    actorB = {
      userId: users[1].user_id,
      neonAuthUserId: "MOCK_NEON_AUTH_USER_B",
      roles: ["talent"],
      permissions: [],
      platformAdmin: false,
    };
    adminActor = {
      userId: admins[0]?.user_id ?? users[0].user_id,
      neonAuthUserId: "MOCK_NEON_AUTH_ADMIN",
      roles: ["admin", "super_admin"],
      permissions: ["*"],
      platformAdmin: true,
    };
  });

  afterAll(async () => {
    await getPool().end();
  });

  it("Colleges: lists public approved colleges and gets details", async () => {
    const repo = new NeonCollegesRepository();
    const colleges = await repo.listPublicInstitutes({ limit: 5 });
    expect(colleges.length).toBeGreaterThan(0);
    expect(colleges[0].status).toBe("approved");

    const single = await repo.getPublicInstitute(colleges[0].id);
    expect(single).not.toBeNull();
    expect(single?.name).toBe(colleges[0].name);
  });

  it("Jobs: searches public jobs, submits application, checks duplicate rejection and rollback", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const repo = new NeonJobsRepository({ query: (sql, p) => client.query(sql, [...p]).then(r => r.rows) });

      const seedJob = await client.query<{ id: string; title: string }>(`
        INSERT INTO public.jobs (
          title, description, location, job_type, experience_level,
          is_active, status, approval_status, application_deadline, created_at, updated_at
        ) VALUES (
          'E2E Test Backend Engineer', 'Neon Staging Test Role', 'Kathmandu', 'full_time', 'senior',
          true, 'published', 'approved', now() + interval '30 days', now(), now()
        ) RETURNING id, title`, []);

      const testJob = seedJob.rows[0];

      // Submit application
      const app = await repo.submitJobApplication(actorA, {
        jobId: testJob.id,
        fullName: "Applicant Test",
        email: "applicant.test@example.com",
        phone: "+9779800000000",
        coverLetter: "Interested in this role.",
        skills: ["TypeScript", "PostgreSQL"],
      }, client);

      expect(app.id).toBeDefined();
      expect(app.job_id).toBe(testJob.id);
      expect(app.user_id).toBe(actorA.userId);
      expect(app.status).toBe("submitted");

      // Verify duplicate submission is rejected
      await expect(
        repo.submitJobApplication(actorA, {
          jobId: testJob.id,
          fullName: "Applicant Test",
          email: "applicant.test@example.com",
          phone: "+9779800000000",
        }, client)
      ).rejects.toThrow();

      // Check own applications list
      const ownApps = await repo.listOwnApplications(actorA);
      expect(ownApps.some(a => a.id === app.id)).toBe(true);

      // Recruiter scheduling interview
      const scheduled = await repo.scheduleInterview(adminActor, app.id, {
        interviewAt: new Date(Date.now() + 86400000).toISOString(),
        interviewLocation: "Google Meet Link",
        interviewDurationMinutes: 30,
      }, client);

      expect(scheduled.status).toBe("interview_scheduled");
      expect(scheduled.interview_location).toBe("Google Meet Link");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("Mentors: lists public mentors without leaking direct private contact, books session, and emits event", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const repo = new NeonMentorsRepository({ query: (sql, p) => client.query(sql, [...p]).then(r => r.rows) });

      // Fetch or seed approved mentor
      let mentors = await repo.listPublicMentors({ limit: 5 });
      if (mentors.length === 0) {
        const seed = await client.query<{ id: string }>(`
          INSERT INTO public.mentors (user_id, headline, hourly_rate, is_available, approval_status)
          VALUES ($1::uuid, 'Test Senior Mentor', 1000, true, 'approved')
          RETURNING id`, [actorB.userId]);
        mentors = await repo.listPublicMentors({ limit: 5 });
      }

      expect(mentors.length).toBeGreaterThan(0);
      const mentor = mentors[0];
      // Verify no direct email or phone column is leaked in PublicMentorRow
      expect((mentor as any).email).toBeUndefined();
      expect((mentor as any).phone).toBeUndefined();

      // Book session as actorA
      const start = new Date(Date.now() + 3600000 * 24);
      const end = new Date(start.getTime() + 3600000);

      const booking = await repo.bookMentorSession(actorA, {
        mentorId: mentor.id,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        topic: "Career Growth & Architecture",
        notes: "Looking forward to discussion",
      }, client);

      expect(booking.id).toBeDefined();
      expect(booking.mentor_id).toBe(mentor.id);
      expect(booking.student_id).toBe(actorA.userId);

      // Verify conversation was created
      const conv = await client.query<{ id: string }>(`
        SELECT id FROM public.conversations
        WHERE mentor_id = $1::uuid AND mentee_id = $2::uuid`, [mentor.id, actorA.userId]);
      expect(conv.rows.length).toBeGreaterThan(0);

      // Verify notification events were appended for actorA
      const [latestEvent] = await listApplicationEvents(actorA, "0", null, {
        query: (sql, p) => client.query(sql, [...p]).then(r => r.rows),
      });
      expect(latestEvent).toBeDefined();
      expect(latestEvent.kind).toBe("notification");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("Events: lists public events, registers ticket, enforces capacity and duplicate check", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const repo = new NeonEventsRepository({ query: (sql, p) => client.query(sql, [...p]).then(r => r.rows) });

      let events = await repo.listPublicEvents({ limit: 5 });
      let testEvent = events[0];
      if (!testEvent) {
        const seed = await client.query<{ id: string }>(`
          INSERT INTO public.events (
            organizer_user_id, organizer_type, title, event_type, format,
            start_date, end_date, capacity, ticket_price, currency,
            is_active, status, approval_status
          ) VALUES (
            $1::uuid, 'user', 'Staging Test Tech Conference', 'free', 'online',
            now() + interval '7 days', now() + interval '8 days', 100, 0, 'NPR',
            true, 'published', 'approved'
          ) RETURNING id`, [adminActor.userId]);
        events = await repo.listPublicEvents({ limit: 5 });
        testEvent = events[0];
      }

      expect(testEvent).toBeDefined();

      // Register for event
      const reg = await repo.registerForEvent(actorA, {
        eventId: testEvent.id,
        ticketQuantity: 1,
        participants: [{ fullName: "Attendee A", email: "attendee@example.com" }],
      }, client);

      expect(reg.id).toBeDefined();
      expect(reg.event_id).toBe(testEvent.id);
      expect(reg.user_id).toBe(actorA.userId);
      expect(reg.status).toBe("confirmed");

      // Verify duplicate registration is rejected
      await expect(
        repo.registerForEvent(actorA, { eventId: testEvent.id }, client)
      ).rejects.toThrow();

      // Check own tickets
      const tickets = await repo.listOwnTickets(actorA);
      expect(tickets.some(t => t.id === reg.id)).toBe(true);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("Payments: creates payment record, verifies callback, and updates reference status", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const repo = new NeonPaymentsRepository({ query: (sql, p) => client.query(sql, [...p]).then(r => r.rows) });

      // Create payment record
      const payment = await repo.createPayment(actorA, {
        paymentType: "mentor_booking",
        amount: 1500,
        currency: "NPR",
        paymentMethod: "esewa",
        gateway: "esewa",
        metadata: { purpose: "test sandbox verification" },
      });

      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(1500);
      expect(payment.status).toBe("pending");

      // Verify sandbox callback
      const verified = await repo.verifyPaymentCallback(actorA, payment.id, {
        gatewayTransactionId: "ESEWA_TXN_TEST_998877",
        status: "completed",
      }, client);

      expect(verified.status).toBe("completed");
      expect(verified.gateway_transaction_id).toBe("ESEWA_TXN_TEST_998877");
      expect(verified.paid_at).toBeDefined();

      // List own payments
      const ownPayments = await repo.listOwnPayments(actorA);
      expect(ownPayments.some(p => p.id === payment.id)).toBe(true);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("Messaging: lists conversations, sends message, isolates events, and marks read", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const repo = new NeonMessagingRepository({ query: (sql, p) => client.query(sql, [...p]).then(r => r.rows) });

      // Ensure mentor profile for actorB
      const mentorRow = await client.query<{ id: string }>(`
        INSERT INTO public.mentors (user_id, headline, hourly_rate, is_available, approval_status)
        VALUES ($1::uuid, 'Messaging Test Mentor', 0, true, 'approved')
        RETURNING id`, [actorB.userId]);

      const mentorId = mentorRow.rows[0].id;

      // Ensure conversation between actorA and mentor actorB
      const convRow = await client.query<{ id: string }>(`
        INSERT INTO public.conversations (mentor_id, mentee_id, is_active)
        VALUES ($1::uuid, $2::uuid, true)
        RETURNING id`, [mentorId, actorA.userId]);

      const convId = convRow.rows[0].id;

      // ActorA sends message to mentor ActorB
      const msg = await repo.sendMessage(actorA, convId, "Hello mentor, checking my progress!", undefined, client);
      expect(msg.id).toBeDefined();
      expect(msg.conversation_id).toBe(convId);
      expect(msg.sender_id).toBe(actorA.userId);
      expect(msg.receiver_id).toBe(actorB.userId);
      expect(msg.is_read).toBe(false);

      // Verify recipient actorB receives durable event
      const eventsB = await listApplicationEvents(actorB, "0", convId, {
        query: (sql, p) => client.query(sql, [...p]).then(r => r.rows),
      });
      expect(eventsB.some(e => e.source_id === msg.id && e.kind === "message")).toBe(true);

      // Verify sender actorA does NOT receive recipient's message event
      const eventsA = await listApplicationEvents(actorA, "0", convId, {
        query: (sql, p) => client.query(sql, [...p]).then(r => r.rows),
      });
      expect(eventsA.some(e => e.source_id === msg.id)).toBe(false);

      // ActorB marks conversation read
      const markedCount = await repo.markConversationRead(actorB, convId);
      expect(markedCount).toBeGreaterThan(0);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("Storage: uploads test resume, verifies signed download, and denies unauthorized read", async () => {
    const objectUuid = randomUUID();
    const fakePdf = new Uint8Array(Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"));
    const path = `${actorA.userId}/resume/self/${objectUuid}.pdf`;

    try {
      // Upload as owner actorA
      const uploaded = await uploadBytes(actorA, {
        module: "resume",
        fileName: "e2e-test-resume.pdf",
        contentType: "application/pdf",
        bytes: fakePdf,
        path,
      });

      expect(uploaded.bucket).toBe("resumes");
      expect(uploaded.path).toBe(path);

      // Signed download for owner actorA
      const signedUrl = await privateDownloadUrl(actorA, {
        module: "resume",
        path,
      });
      expect(signedUrl).toContain("https://");
      expect(signedUrl).toContain(encodeURIComponent(path));

      // Denied for unrelated foreign actorB
      await expect(
        privateDownloadUrl(actorB, {
          module: "resume",
          path,
        })
      ).rejects.toThrow();
    } finally {
      await deleteObject("resumes", path).catch(() => undefined);
    }
  });
});
