import type { JobPreferences } from "./job-matching";

export interface StudentJobApplication {
  id: string;
  job_id: string;
  status: "submitted" | "applied" | "screening" | "shortlisted" | "interview" | "selected" | "offered" | "confirmed" | "rejected" | "withdrawn";
  applied_at: string;
  updated_at: string;
  resume_url?: string | null;
  cover_letter?: string | null;
  portfolio_url?: string | null;
  skills_match_score?: number | null;
  timeline?: Array<{
    status: string;
    timestamp: string;
    note?: string | null;
  }>;
  interview_at?: string | null;
  interview_location?: string | null;
  interview_duration_minutes?: number | null;
  interview_type?: string | null;
  interview_status?: string | null;
  job?: {
    id: string;
    title: string;
    location?: string | null;
    job_type?: string | null;
    experience_level?: string | null;
    salary_min?: number | null;
    salary_max?: number | null;
    is_remote?: boolean | null;
    company?: {
      id: string;
      name: string;
      logo_url?: string | null;
    } | null;
  };
}

export interface ScheduledInterview {
  id: string;
  job_id: string;
  status: string;
  interview_at: string;
  interview_location?: string | null;
  interview_duration_minutes?: number | null;
  interview_type?: string | null;
  interview_notes?: string | null;
  interview_status?: string | null;
  job?: {
    id: string;
    title: string;
    location?: string | null;
    company?: {
      id: string;
      name: string;
      logo_url?: string | null;
    } | null;
  };
}

export async function fetchMatchingJobs(token: string) {
  const res = await fetch("/api/v1/jobs/matching", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load matching jobs.");
  return json.data || [];
}

export async function fetchJobPreferences(token: string): Promise<JobPreferences> {
  const res = await fetch("/api/v1/jobs/preferences", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load job preferences.");
  return json.data || {};
}

export async function updateJobPreferences(prefs: JobPreferences, token: string) {
  const res = await fetch("/api/v1/jobs/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(prefs),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to update job preferences.");
  return json.data;
}

export async function fetchStudentApplications(token: string): Promise<StudentJobApplication[]> {
  const res = await fetch("/api/v1/jobs/applications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load job applications.");
  return json.data || [];
}

export async function fetchStudentInterviews(token: string): Promise<ScheduledInterview[]> {
  const res = await fetch("/api/v1/jobs/interviews", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load interview schedule.");
  return json.data || [];
}

export async function fetchSavedJobsList(token: string) {
  const res = await fetch("/api/v1/jobs/saved", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load saved jobs.");
  return json.data || [];
}

export async function saveJobApi(jobId: string, token: string) {
  const res = await fetch("/api/v1/jobs/saved", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jobId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to save job.");
  return json.data;
}

export async function unsaveJobApi(jobId: string, token: string) {
  const res = await fetch(`/api/v1/jobs/saved?jobId=${jobId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to remove saved job.");
  return json.data;
}

export async function submitJobApplicationApi(
  payload: {
    jobId: string;
    fullName: string;
    email: string;
    phone: string;
    coverLetter?: string;
    portfolioUrl?: string;
    resumeUrl?: string;
    skills?: string[];
    expectedSalary?: number;
    answers?: Record<string, unknown>;
    education?: any[];
    experience?: any[];
    certifications?: any[];
  },
  token: string
) {
  const res = await fetch("/api/v1/jobs/apply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to submit job application.");
  return json.data;
}
