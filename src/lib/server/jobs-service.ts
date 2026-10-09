import { getAdminClient } from "./supabase";
import { calculateJobMatch } from "../jobs/job-matching";

export interface SubmitApplicationInput {
  userId: string;
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
  education?: Array<{ institution: string; degree: string; field: string; startYear: string; endYear: string }>;
  experience?: Array<{ organization: string; role: string; startDate: string; endDate: string; description: string }>;
  certifications?: Array<{ name: string; issuer: string; issuedDate: string }>;
}

export async function submitJobApplication(input: SubmitApplicationInput) {
  const db = getAdminClient() as any;
  const now = new Date();

  // 1. Fetch Job
  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, title, company_id, location, job_type, experience_level, category, industry, skills_required, is_active, status, application_deadline")
    .eq("id", input.jobId)
    .is("deleted_at", null)
    .maybeSingle();

  if (jobError || !job) {
    throw new Error("The requested job was not found or has been removed.");
  }

  if (job.status === "closed" || job.status === "cancelled" || job.status === "expired" || !job.is_active) {
    throw new Error("Applications for this job are currently closed.");
  }

  if (job.application_deadline && new Date(job.application_deadline).getTime() < now.getTime()) {
    throw new Error("The application deadline for this position has passed.");
  }

  // 2. Fetch User Profile
  const { data: profile } = await db
    .from("profiles")
    .select("id, full_name, email, phone, location, bio, education_history, experience_history, certifications, skills, resume_url, job_preferences")
    .eq("id", input.userId)
    .maybeSingle();

  // 3. Check for existing application
  const { data: existingApp } = await db
    .from("job_applications")
    .select("id, status")
    .eq("job_id", job.id)
    .eq("user_id", input.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingApp && existingApp.status !== "withdrawn") {
    throw new Error("You have already applied for this job position.");
  }

  // 4. Construct Immutable Submitted Profile Snapshots
  const profileSnapshot = {
    fullName: input.fullName || profile?.full_name || "Applicant",
    email: input.email || profile?.email || "",
    phone: input.phone || profile?.phone || "",
    location: profile?.location || null,
    bio: profile?.bio || null,
    portfolioUrl: input.portfolioUrl || null,
    submittedAt: now.toISOString(),
  };

  const educationSnapshot = input.education && input.education.length > 0
    ? input.education
    : (Array.isArray(profile?.education_history) ? profile.education_history : []);

  const experienceSnapshot = input.experience && input.experience.length > 0
    ? input.experience
    : (Array.isArray(profile?.experience_history) ? profile.experience_history : []);

  const skillsSnapshot = input.skills && input.skills.length > 0
    ? input.skills
    : (Array.isArray(profile?.skills) ? profile.skills : []);

  const trainingSnapshot = input.certifications && input.certifications.length > 0
    ? input.certifications
    : (Array.isArray(profile?.certifications) ? profile.certifications : []);

  const resumeUrlSnapshot = input.resumeUrl || profile?.resume_url || null;

  // Calculate deterministic skills match score
  const matchResult = calculateJobMatch(
    {
      skills: skillsSnapshot,
      location: profileSnapshot.location,
      experience_level: profile?.experience_level,
      job_preferences: profile?.job_preferences,
    },
    job
  );

  const initialTimeline = [
    {
      status: "applied",
      timestamp: now.toISOString(),
      note: "Application submitted by candidate.",
    },
  ];

  const applicationPayload = {
    job_id: job.id,
    user_id: input.userId,
    resume_url: resumeUrlSnapshot,
    resume_url_snapshot: resumeUrlSnapshot,
    cover_letter: input.coverLetter || null,
    portfolio_url: input.portfolioUrl || null,
    skills_match_score: matchResult.matchScore,
    status: "applied",
    profile_snapshot: profileSnapshot,
    education_snapshot: educationSnapshot,
    experience_snapshot: experienceSnapshot,
    skills_snapshot: skillsSnapshot,
    training_snapshot: trainingSnapshot,
    answers: input.answers || {},
    timeline: initialTimeline,
    applied_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  let applicationResult: any = null;

  if (existingApp) {
    const { data: updated, error: updateError } = await db
      .from("job_applications")
      .update(applicationPayload)
      .eq("id", existingApp.id)
      .select("*")
      .single();
    if (updateError) throw updateError;
    applicationResult = updated;
  } else {
    const { data: created, error: insertError } = await db
      .from("job_applications")
      .insert(applicationPayload)
      .select("*")
      .single();
    if (insertError) throw insertError;
    applicationResult = created;
  }

  // Queue in-app notification
  const { error: notifErr } = await db.from("notifications").insert({
    recipient_id: input.userId,
    title: `Application Submitted: ${job.title}`,
    message: `Your application for "${job.title}" was submitted successfully. You can track your recruitment status on your dashboard.`,
    type: "success",
    category: "job",
    channel: "dashboard",
    status: "queued",
    entity_type: "job_application",
    entity_id: applicationResult.id,
    action_url: "/dashboard/jobs",
  });
  if (notifErr) console.error("Job application notification error:", notifErr);

  // Record Audit Log
  const { error: auditErr } = await db.from("audit_logs").insert({
    actor_user_id: input.userId,
    action: "JOB_APPLICATION_SUBMITTED",
    entity_type: "job_application",
    entity_id: applicationResult.id,
    metadata: {
      job_id: job.id,
      match_score: matchResult.matchScore,
    },
  });
  if (auditErr) console.error("Audit log error:", auditErr);

  return {
    application: applicationResult,
    matchScore: matchResult.matchScore,
    matchReasons: matchResult.matchReasons,
  };
}

export async function getStudentInterviews(userId: string) {
  const db = getAdminClient() as any;
  const { data, error } = await db
    .from("job_applications")
    .select(`
      id,
      job_id,
      status,
      interview_at,
      interview_location,
      interview_duration_minutes,
      interview_type,
      interview_notes,
      interview_status,
      job:job_id (
        id,
        title,
        location,
        company:company_id (
          id,
          name,
          logo_url
        )
      )
    `)
    .eq("user_id", userId)
    .not("interview_at", "is", null)
    .is("deleted_at", null)
    .order("interview_at", { ascending: true });

  if (error) throw error;
  return data || [];
}
