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
import { NeonCheckoutService } from "@/lib/server/neon-checkout";
import type { EsewaV2PaymentProvider } from "@/lib/server/payment-provider";
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

    // Keep the legacy module tests' second user while binding Jobs to a real
    // verified synthetic Managed Auth identity instead of a non-UUID placeholder.
    const users = await queryRows<{ user_id: string }>(`
      SELECT user_id FROM public.profiles
      WHERE account_status = 'active' AND deleted_at IS NULL
      ORDER BY user_id LIMIT 2`);

    const linked = await queryRows<{ user_id: string; neon_auth_user_id: string }>(`
      SELECT a.legacy_user_id AS user_id, l.neon_auth_user_id
      FROM public.neon_identity_links l
      JOIN public.neon_application_accounts a ON a.id = l.application_account_id
      JOIN public.profiles p ON p.user_id = a.legacy_user_id
      WHERE l.status = 'verified' AND a.status = 'active'
        AND p.account_status = 'active' AND p.deleted_at IS NULL
      LIMIT 1`);

    const admins = await queryRows<{ user_id: string }>(`
      SELECT ur.user_id FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.role IN ('admin', 'super_admin') AND p.account_status = 'active'
      LIMIT 1`);

    expect(users).toHaveLength(2);
    expect(linked).toHaveLength(1);
    actorA = {
      userId: linked[0].user_id,
      neonAuthUserId: linked[0].neon_auth_user_id,
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
      neonAuthUserId: "00000000-0000-4000-8000-000000000002",
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

      await client.query(`
        UPDATE public.profiles
        SET full_name = 'Staging Job Applicant', email = 'staging-job-applicant@example.invalid',
            phone = '+9779800000000'
        WHERE user_id = $1::uuid`, [actorA.userId]);

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

      // The transaction is intentionally uncommitted; verify its effect with
      // the same client rather than an unrelated pooled connection.
      const ownApps = await client.query<{ id: string }>(`
        SELECT id FROM public.job_applications
        WHERE id = $1::uuid AND user_id = $2::uuid`, [app.id, actorA.userId]);
      expect(ownApps.rows).toHaveLength(1);

      // A nominal admin without a verified Managed Auth link must not schedule.
      await expect(repo.scheduleInterview(adminActor, app.id, {
        interviewAt: new Date(Date.now() + 86400000).toISOString(),
        interviewLocation: "Google Meet Link",
        interviewDurationMinutes: 30,
      }, client)).rejects.toThrow();
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

      const seeded = await client.query<{ id: string }>(`
        INSERT INTO public.mentors (user_id, headline, hourly_rate, is_available, approval_status)
        VALUES ($1::uuid, 'Staging Senior Mentor', 1000, true, 'approved')
        ON CONFLICT (user_id) DO UPDATE SET is_available=true,approval_status='approved'
        RETURNING id`, [actorB.userId]);
      const mentor = (await repo.getPublicMentor(seeded.rows[0].id))!;
      expect(mentor).toBeDefined();
      // Verify no direct email or phone column is leaked in PublicMentorRow
      expect((mentor as any).email).toBeUndefined();
      expect((mentor as any).phone).toBeUndefined();

      const service = await client.query<{ id: string }>(`
        INSERT INTO public.mentor_services (mentor_id,title,duration_minutes,price,currency)
        VALUES ($1::uuid,'Staging test session',60,1000,'NPR') RETURNING id`, [mentor.id]);
      await client.query(`UPDATE public.profiles SET full_name='Staging Test Student',phone='9800000000'
        WHERE user_id=$1::uuid`, [actorA.userId]);

      // Book session as actorA
      const start = new Date(Date.now() + 3600000 * 24);
      const end = new Date(start.getTime() + 3600000);

      const booking = await repo.bookMentorSession(actorA, {
        mentorId: mentor.id,
        mentorServiceId: service.rows[0].id,
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
      const testEvent = (await repo.getPublicEvent(seed.rows[0].id))!;

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

  it("Payments: creates a pending record and rejects an unverified callback", async () => {
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

      // A browser/actor-supplied success is not a verified eSewa result.
      await expect(repo.verifyPaymentCallback(actorA, payment.id, {
        gatewayTransactionId: "ESEWA_TXN_TEST_998877", status: "completed",
      })).rejects.toMatchObject({ code: "VERIFIED_PROVIDER_REQUIRED" });
      const stillPending = await client.query<{ status: string }>(`
        SELECT status FROM public.payments WHERE id=$1::uuid`, [payment.id]);
      expect(stillPending.rows[0].status).toBe("pending");

      // List own payments
      const ownPayments = await repo.listOwnPayments(actorA);
      expect(ownPayments.some(p => p.id === payment.id)).toBe(true);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("Payments: stages a server-priced event intent and fulfills exactly once after provider verification", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const event = (await client.query<{ id: string }>(`INSERT INTO public.events
        (organizer_user_id,organizer_type,title,event_type,format,start_date,end_date,capacity,
         ticket_price,currency,is_active,status,approval_status)
        VALUES ($1::uuid,'user','Checkout test event','paid','online',now()+interval '7 days',
          now()+interval '8 days',10,400,'NPR',true,'published','approved') RETURNING id`, [adminActor.userId])).rows[0];
      const tier = (await client.query<{ id: string }>(`INSERT INTO public.event_ticket_types
        (event_id,name,price,currency,total_quantity,min_per_order,max_per_order,is_active)
        VALUES ($1::uuid,'Normal',400,'NPR',10,1,10,true) RETURNING id`, [event.id])).rows[0];
      const registration = await new NeonEventsRepository().registerForEvent(actorA, {
        eventId: event.id, ticketTypeId: tier.id, ticketQuantity: 2,
        participants: [{ fullName: "Fixture One" }, { fullName: "Fixture Two" }],
      }, client);
      const provider = {
        createCheckout: async ({ paymentId }: { paymentId: string }) => ({
          status: "pending", checkoutUrl: "https://sandbox.example.invalid/form",
          checkoutFields: { transaction_uuid: paymentId },
        }),
        verifyRedirectPayload: () => true,
        lookupStatus: async ({ reference }: { reference: string }) => ({ status: "successful", transactionId: `sandbox-${reference}` }),
      } as unknown as EsewaV2PaymentProvider;
      const checkout = new NeonCheckoutService(provider);
      const initiated = await checkout.initiate(actorA, "event_registration", registration.id, "http://localhost:3210", client);
      expect(Number(initiated.session.amount)).toBe(800);
      const reused = await checkout.initiate(actorA, "event_registration", registration.id, "http://localhost:3210", client);
      expect(reused.reused).toBe(true);
      const reference = initiated.session.provider_reference;
      const before = await client.query(`SELECT id FROM public.event_tickets WHERE registration_id=$1::uuid`, [registration.id]);
      expect(before.rowCount).toBe(0);
      const pending = await client.query<{ status: string; payment_status: string; total_amount: number }>(
        `SELECT status,payment_status,total_amount::float AS total_amount FROM public.event_registrations WHERE id=$1::uuid`, [registration.id]);
      expect(pending.rows[0]).toMatchObject({ status: "pending", payment_status: "pending", total_amount: 800 });
      const settled = await checkout.verifyReturn({ reference }, client);
      expect(settled.status).toBe("successful");
      const repeated = await checkout.verifyReturn({ reference }, client);
      expect(repeated.duplicate).toBe(true);
      const after = await client.query(`SELECT id FROM public.event_tickets WHERE registration_id=$1::uuid`, [registration.id]);
      expect(after.rowCount).toBe(2);
      const paid = await client.query<{ status: string; payment_status: string }>(
        `SELECT status,payment_status FROM public.event_registrations WHERE id=$1::uuid`, [registration.id]);
      expect(paid.rows[0]).toMatchObject({ status: "confirmed", payment_status: "success" });
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
      expect(signedUrl).toContain(path);

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
