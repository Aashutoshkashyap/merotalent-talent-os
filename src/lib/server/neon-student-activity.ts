/** Student-owned activity across modules. The caller's ID comes only from a verified session. */
import type { QueryResultRow } from "pg";
import { queryRows } from "./db";
import type { NeonActor } from "./neon-authorization";

type Query = typeof queryRows;
const text = (value: unknown, fallback = "") => value == null ? fallback : String(value);
const date = (value: unknown) => value instanceof Date ? value.toISOString() : text(value);
const formRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function getNeonStudentActivity(actor: NeonActor, query: Query = queryRows) {
  const params = [actor.userId];
  const [colleges, jobs, events, mentors] = await Promise.all([
    query<QueryResultRow>(`SELECT a.id,a.institute_id,i.name AS institute_name,a.program_interest,
      a.status,a.submitted_at,a.updated_at
      FROM public.college_applications a
      JOIN public.institutes i ON i.id=a.institute_id
      WHERE a.applicant_id=$1::uuid AND a.deleted_at IS NULL
      ORDER BY a.submitted_at DESC LIMIT 100`, params),
    query<QueryResultRow>(`SELECT a.id,a.job_id,j.title AS job_title,c.name AS company_name,
      a.status,a.applied_at,a.updated_at
      FROM public.job_applications a JOIN public.jobs j ON j.id=a.job_id
      LEFT JOIN public.companies c ON c.id=j.company_id
      WHERE a.user_id=$1::uuid AND a.deleted_at IS NULL
      ORDER BY a.applied_at DESC LIMIT 100`, params),
    query<QueryResultRow>(`SELECT r.id,r.event_id,e.title AS event_title,e.start_date,e.end_date,
      e.format,e.location,r.status,r.payment_status,r.ticket_quantity,r.total_amount,r.registered_at
      FROM public.event_registrations r JOIN public.events e ON e.id=r.event_id
      WHERE r.user_id=$1::uuid AND r.deleted_at IS NULL
      ORDER BY r.registered_at DESC LIMIT 100`, params),
    query<QueryResultRow>(`SELECT b.id,b.mentor_id,p.full_name AS mentor_name,p.avatar_url AS mentor_avatar,
      m.expertise,s.title AS service_title,b.scheduled_start,b.scheduled_end,b.status,
      b.payment_status,b.amount,b.currency,b.notes,b.form_data,b.created_at
      FROM public.mentor_bookings b JOIN public.mentors m ON m.id=b.mentor_id
      JOIN public.profiles p ON p.user_id=m.user_id
      LEFT JOIN public.mentor_services s ON s.id=b.mentor_service_id
      WHERE b.student_id=$1::uuid AND b.deleted_at IS NULL
      ORDER BY b.scheduled_start ASC LIMIT 100`, params),
  ]);
  return {
    collegeApplications: colleges.map(row => ({ id: text(row.id), instituteId: text(row.institute_id),
      instituteName: text(row.institute_name, "College listing"),
      programInterest: typeof row.program_interest === "string" ? row.program_interest : null,
      status: text(row.status, "submitted"), submittedAt: date(row.submitted_at),
      updatedAt: date(row.updated_at ?? row.submitted_at) })),
    jobApplications: jobs.map(row => ({ id: text(row.id), jobId: text(row.job_id),
      jobTitle: text(row.job_title, "Job listing"), companyName: text(row.company_name, "Employer"),
      status: text(row.status, "submitted"), appliedAt: date(row.applied_at),
      updatedAt: date(row.updated_at ?? row.applied_at) })),
    eventRegistrations: events.map(row => ({ id: text(row.id), eventId: text(row.event_id),
      eventTitle: text(row.event_title, "Event"), eventStart: row.start_date ? date(row.start_date) : null,
      eventEnd: row.end_date ? date(row.end_date) : null,
      eventFormat: typeof row.format === "string" ? row.format : null,
      eventLocation: typeof row.location === "string" ? row.location : null,
      status: text(row.status, "pending"), paymentStatus: text(row.payment_status, "pending"),
      ticketQuantity: Number(row.ticket_quantity ?? 0), totalAmount: Number(row.total_amount ?? 0),
      registeredAt: date(row.registered_at) })),
    mentorBookings: mentors.map(row => { const formData = formRecord(row.form_data);
      return { id: text(row.id), mentorId: text(row.mentor_id), mentorName: text(row.mentor_name, "Mentor"),
        mentorAvatar: typeof row.mentor_avatar === "string" ? row.mentor_avatar : null,
        mentorExpertise: Array.isArray(row.expertise) ? row.expertise.map(String) : [],
        serviceTitle: typeof row.service_title === "string" ? row.service_title : null,
        scheduledStart: date(row.scheduled_start), scheduledEnd: date(row.scheduled_end),
        status: text(row.status, "pending"), paymentStatus: text(row.payment_status, "pending"),
        amount: Number(row.amount ?? 0), currency: text(row.currency, "NPR"),
        topic: typeof formData.topic === "string" ? formData.topic : null,
        notes: typeof row.notes === "string" ? row.notes : null, createdAt: date(row.created_at) };
    }),
  };
}
