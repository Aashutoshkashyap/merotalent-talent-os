"use client";
import { isNeonClientRuntime } from "@/lib/backend-selection";


import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getStudentActivityCacheKey } from "@/lib/student/activity-cache";

export interface StudentCollegeApplication {
  id: string;
  instituteId: string;
  instituteName: string;
  programInterest: string | null;
  status: string;
  submittedAt: string;
  updatedAt: string;
}

export interface StudentJobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: string;
  appliedAt: string;
  updatedAt: string;
}

export interface StudentEventRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStart: string | null;
  eventEnd: string | null;
  eventFormat: string | null;
  eventLocation: string | null;
  status: string;
  paymentStatus: string;
  ticketQuantity: number;
  totalAmount: number;
  registeredAt: string;
}

export interface StudentMentorBooking {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar: string | null;
  mentorExpertise: string[];
  serviceTitle: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  topic: string | null;
  notes: string | null;
  createdAt: string;
}

export interface StudentActivityData {
  collegeApplications: StudentCollegeApplication[];
  jobApplications: StudentJobApplication[];
  eventRegistrations: StudentEventRegistration[];
  mentorBookings: StudentMentorBooking[];
}

const emptyData: StudentActivityData = {
  collegeApplications: [],
  jobApplications: [],
  eventRegistrations: [],
  mentorBookings: [],
};
const isNeonStaging = isNeonClientRuntime();

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const uniqueStrings = (values: unknown[]) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];

const queryByIds = async (
  table: string,
  select: string,
  ids: string[],
) => {
  if (ids.length === 0) return [] as Record<string, unknown>[];
  const { data, error } = await (supabase as any)
    .from(table)
    .select(select)
    .in("id", ids);
  if (error) throw new Error(error.message || `${table} context could not be loaded.`);
  return (data || []) as Record<string, unknown>[];
};

const CACHE_TTL = 120000; // 2 minutes

const getCachedActivityData = (userId: string): StudentActivityData | null => {
  try {
    const raw = localStorage.getItem(getStudentActivityCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL) {
      return parsed.data;
    }
  } catch {}
  return null;
};

const setCachedActivityData = (userId: string, data: StudentActivityData) => {
  try {
    localStorage.setItem(
      getStudentActivityCacheKey(userId),
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch {}
};

export const useStudentActivity = () => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentActivityData>(() => {
    if (!user) return emptyData;
    return getCachedActivityData(user.id) || emptyData;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (!user) return false;
    return !getCachedActivityData(user.id);
  });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(emptyData);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Check cache first for zero lag loading
    const cached = getCachedActivityData(user.id);
    if (cached) {
      setData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    setError(null);
    try {
      if (isNeonStaging) {
        const response = await fetch("/api/v1/neon-staging/student-activity", {
          credentials: "same-origin", cache: "no-store",
        });
        if (!response.ok) throw new Error("Student activity could not be loaded.");
        const payload = await response.json() as { data?: StudentActivityData };
        const nextData = payload.data;
        if (!nextData || !Array.isArray(nextData.collegeApplications)
          || !Array.isArray(nextData.jobApplications)
          || !Array.isArray(nextData.eventRegistrations)
          || !Array.isArray(nextData.mentorBookings)) {
          throw new Error("Student activity response was invalid.");
        }
        setData(nextData);
        setCachedActivityData(user.id, nextData);
        return;
      }
      const [collegeResult, jobResult, eventResult, bookingResult] = await Promise.all([
        (supabase as any)
          .from("college_applications")
          .select("id,institute_id,program_interest,status,submitted_at,updated_at")
          .eq("applicant_id", user.id)
          .is("deleted_at", null)
          .order("submitted_at", { ascending: false }),
        (supabase as any)
          .from("job_applications")
          .select("id,job_id,status,applied_at,updated_at")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("applied_at", { ascending: false }),
        (supabase as any)
          .from("event_registrations")
          .select("id,event_id,status,payment_status,ticket_quantity,total_amount,registered_at")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("registered_at", { ascending: false }),
        (supabase as any)
          .from("mentor_bookings")
          .select("id,mentor_id,mentor_service_id,scheduled_start,scheduled_end,status,payment_status,amount,currency,notes,form_data,created_at")
          .eq("student_id", user.id)
          .is("deleted_at", null)
          .order("scheduled_start", { ascending: true }),
      ]);

      const failed = [collegeResult, jobResult, eventResult, bookingResult]
        .find((result) => result.error)?.error;
      if (failed) throw new Error(failed.message || "Student activity could not be loaded.");

      const collegeRows = (collegeResult.data || []) as Record<string, unknown>[];
      const jobRows = (jobResult.data || []) as Record<string, unknown>[];
      const eventRows = (eventResult.data || []) as Record<string, unknown>[];
      const bookingRows = (bookingResult.data || []) as Record<string, unknown>[];

      const [institutes, jobs, events, mentors, services] = await Promise.all([
        queryByIds("institutes", "id,name", uniqueStrings(collegeRows.map((row) => row.institute_id))),
        queryByIds("jobs", "id,title,company_id", uniqueStrings(jobRows.map((row) => row.job_id))),
        queryByIds("events", "id,title,start_date,end_date,format,location", uniqueStrings(eventRows.map((row) => row.event_id))),
        queryByIds("mentors", "id,user_id,expertise", uniqueStrings(bookingRows.map((row) => row.mentor_id))),
        queryByIds("mentor_services", "id,title", uniqueStrings(bookingRows.map((row) => row.mentor_service_id))),
      ]);

      const companies = await queryByIds(
        "companies",
        "id,name",
        uniqueStrings(jobs.map((row) => row.company_id)),
      );
      const mentorUserIds = uniqueStrings(mentors.map((row) => row.user_id));
      let mentorProfiles: Record<string, unknown>[] = [];
      if (mentorUserIds.length > 0) {
        const { data: profileRows, error: profileError } = await (supabase as any)
          .from("public_profile_directory")
          .select("user_id,full_name,avatar_url")
          .in("user_id", mentorUserIds);
        if (profileError) throw new Error(profileError.message || "Mentor profiles could not be loaded.");
        mentorProfiles = (profileRows || []) as Record<string, unknown>[];
      }

      const instituteById = new Map(institutes.map((row) => [String(row.id), row]));
      const jobById = new Map(jobs.map((row) => [String(row.id), row]));
      const companyById = new Map(companies.map((row) => [String(row.id), row]));
      const eventById = new Map(events.map((row) => [String(row.id), row]));
      const mentorById = new Map(mentors.map((row) => [String(row.id), row]));
      const serviceById = new Map(services.map((row) => [String(row.id), row]));
      const profileByUserId = new Map(mentorProfiles.map((row) => [String(row.user_id), row]));

      const nextData: StudentActivityData = {
        collegeApplications: collegeRows.map((row) => {
          const institute = instituteById.get(String(row.institute_id));
          return {
            id: String(row.id),
            instituteId: String(row.institute_id),
            instituteName: String(institute?.name || "College listing"),
            programInterest: typeof row.program_interest === "string" ? row.program_interest : null,
            status: String(row.status || "submitted"),
            submittedAt: String(row.submitted_at),
            updatedAt: String(row.updated_at || row.submitted_at),
          };
        }),
        jobApplications: jobRows.map((row) => {
          const job = jobById.get(String(row.job_id));
          const company = companyById.get(String(job?.company_id || ""));
          return {
            id: String(row.id),
            jobId: String(row.job_id),
            jobTitle: String(job?.title || "Job listing"),
            companyName: String(company?.name || "Employer"),
            status: String(row.status || "submitted"),
            appliedAt: String(row.applied_at),
            updatedAt: String(row.updated_at || row.applied_at),
          };
        }),
        eventRegistrations: eventRows.map((row) => {
          const event = eventById.get(String(row.event_id));
          return {
            id: String(row.id),
            eventId: String(row.event_id),
            eventTitle: String(event?.title || "Event"),
            eventStart: typeof event?.start_date === "string" ? event.start_date : null,
            eventEnd: typeof event?.end_date === "string" ? event.end_date : null,
            eventFormat: typeof event?.format === "string" ? event.format : null,
            eventLocation: typeof event?.location === "string" ? event.location : null,
            status: String(row.status || "pending"),
            paymentStatus: String(row.payment_status || "pending"),
            ticketQuantity: Number(row.ticket_quantity || 0),
            totalAmount: Number(row.total_amount || 0),
            registeredAt: String(row.registered_at),
          };
        }),
        mentorBookings: bookingRows.map((row) => {
          const mentor = mentorById.get(String(row.mentor_id));
          const profile = profileByUserId.get(String(mentor?.user_id || ""));
          const service = serviceById.get(String(row.mentor_service_id || ""));
          const formData = asRecord(row.form_data);
          return {
            id: String(row.id),
            mentorId: String(row.mentor_id),
            mentorName: String(profile?.full_name || "Mentor"),
            mentorAvatar: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
            mentorExpertise: Array.isArray(mentor?.expertise) ? mentor.expertise.map(String) : [],
            serviceTitle: typeof service?.title === "string" ? service.title : null,
            scheduledStart: String(row.scheduled_start),
            scheduledEnd: String(row.scheduled_end),
            status: String(row.status || "pending"),
            paymentStatus: String(row.payment_status || "pending"),
            amount: Number(row.amount || 0),
            currency: String(row.currency || "NPR"),
            topic: typeof formData.topic === "string" ? formData.topic : null,
            notes: typeof row.notes === "string" ? row.notes : null,
            createdAt: String(row.created_at),
          };
        }),
      };

      setData(nextData);
      setCachedActivityData(user.id, nextData);
    } catch (loadError) {
      setData(emptyData);
      setError(loadError instanceof Error ? loadError.message : "Student activity could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onActivityUpdated = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { userId?: string } : null;
      if (detail?.userId === user?.id) void refresh();
    };
    window.addEventListener("merotalent:student-activity-updated", onActivityUpdated);
    return () => window.removeEventListener("merotalent:student-activity-updated", onActivityUpdated);
  }, [refresh, user?.id]);

  return { ...data, error, isLoading, refresh };
};
