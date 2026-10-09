import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateJobMatch } from "@/lib/jobs/job-matching";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  adminClient: vi.fn(),
}));

vi.mock("@/lib/server/auth", async (original) => ({
  ...await original<typeof import("@/lib/server/auth")>(),
  authenticateRequest: mocks.auth,
}));

vi.mock("@/lib/server/supabase", () => ({
  getAdminClient: mocks.adminClient,
}));

import { submitJobApplication, getStudentInterviews } from "@/lib/server/jobs-service";

describe("Jobs & Recruitment Architecture", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("1. Deterministic Rule-Based Job Matching Engine", () => {
    it("calculates high match score when skills, title, category, location, and type align", () => {
      const candidate = {
        skills: ["React", "TypeScript", "Node.js", "Tailwind CSS"],
        location: "Kathmandu",
        experience_level: "entry",
        job_preferences: {
          preferred_categories: ["Software", "IT"],
          preferred_industries: ["Technology", "Fintech"],
          preferred_job_titles: ["Frontend Developer", "Full Stack Developer"],
          preferred_locations: ["Kathmandu", "Remote"],
          preferred_job_levels: ["entry", "junior"],
          preferred_job_types: ["full-time"],
          min_salary: 30000,
          max_salary: 60000,
        },
      };

      const job = {
        id: "job-1",
        title: "Frontend Developer",
        category: "Software",
        industry: "Technology",
        location: "Kathmandu",
        is_remote: true,
        job_type: "full-time",
        experience_level: "entry",
        skills_required: ["React", "TypeScript", "Node.js"],
      };

      const result = calculateJobMatch(candidate, job);
      expect(result.matchScore).toBeGreaterThanOrEqual(85);
      expect(result.matchReasons.length).toBeGreaterThan(0);
      expect(result.matchReasons).toContain("Matched 3/3 required skills");
    });

    it("calculates lower score when skills or preferences do not match", () => {
      const candidate = {
        skills: ["Civil Engineering", "AutoCAD", "Surveying"],
        location: "Pokhara",
        experience_level: "mid",
        job_preferences: {
          preferred_categories: ["Civil Engineering"],
          preferred_industries: ["Hydropower", "Construction"],
          preferred_job_titles: ["Civil Engineer"],
          preferred_locations: ["Pokhara"],
          preferred_job_levels: ["mid"],
          preferred_job_types: ["full-time"],
        },
      };

      const job = {
        id: "job-2",
        title: "Senior React Developer",
        category: "Software",
        industry: "IT Services",
        location: "Kathmandu",
        is_remote: false,
        job_type: "full-time",
        experience_level: "senior",
        skills_required: ["React", "GraphQL", "Docker"],
      };

      const result = calculateJobMatch(candidate, job);
      expect(result.matchScore).toBeLessThan(30);
      expect(result.matchReasons).not.toContain("Matched 3/3 required skills");
    });

    it("handles remote preference matching properly", () => {
      const candidate = {
        skills: ["Python", "FastAPI"],
        location: "Biratnagar",
        job_preferences: {
          preferred_locations: ["remote"],
        },
      };

      const job = {
        id: "job-3",
        title: "Python Backend Developer",
        is_remote: true,
        skills_required: ["Python"],
      };

      const result = calculateJobMatch(candidate, job);
      expect(result.matchReasons).toContain("Remote work available");
    });
  });

  describe("2. Profile Pre-fill and Immutable Submitted Application Snapshot", () => {
    it("creates an immutable snapshot of student profile, education, experience, skills, and CV upon application", async () => {
      const mockJob = {
        id: "job-uuid-1",
        title: "Electrical Engineer",
        company_id: "comp-uuid-1",
        location: "Lalitpur",
        job_type: "full-time",
        experience_level: "entry",
        category: "Engineering",
        industry: "Hydropower",
        skills_required: ["MATLAB", "Power Systems"],
        is_active: true,
        status: "published",
        application_deadline: new Date(Date.now() + 86400000).toISOString(),
      };

      const mockProfile = {
        id: "user-uuid-1",
        full_name: "Aashutosh Jha",
        email: "aashutosh@example.com",
        phone: "+9779800000000",
        location: "Kathmandu",
        bio: "Passionate electrical & software engineer",
        education_history: [
          { institution: "Tribhuvan University", degree: "B.E.", field: "Electrical", startYear: "2020", endYear: "2024" },
        ],
        experience_history: [
          { organization: "Nepal Electricity Authority", role: "Intern", startDate: "2023", endDate: "2024", description: "Grid analysis" },
        ],
        certifications: [
          { name: "Power Systems Simulation", issuer: "IEEE Nepal", issuedDate: "2023-11" },
        ],
        skills: ["MATLAB", "Power Systems", "AutoCAD"],
        resume_url: "/uploads/resumes/aashutosh-cv.pdf",
        job_preferences: {
          preferred_categories: ["Engineering"],
          preferred_industries: ["Hydropower"],
          preferred_job_titles: ["Electrical Engineer"],
        },
      };

      let insertedPayload: any = null;

      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === "jobs") {
            return {
              select: () => ({
                eq: () => ({
                  is: () => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
                }),
              }),
            };
          }
          if (table === "job_applications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    is: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
              insert: (payload: any) => {
                insertedPayload = payload;
                return {
                  select: () => ({
                    single: vi.fn().mockResolvedValue({ data: { id: "app-123", ...payload }, error: null }),
                  }),
                };
              },
            };
          }
          if (table === "notifications" || table === "audit_logs") {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      mocks.adminClient.mockReturnValue(mockDb);

      const result = await submitJobApplication({
        userId: "user-uuid-1",
        jobId: "job-uuid-1",
        fullName: "Aashutosh Jha",
        email: "aashutosh@example.com",
        phone: "+9779800000000",
        coverLetter: "I am excited to apply for this role.",
      });

      expect(result.application.id).toBe("app-123");
      expect(insertedPayload).toBeDefined();

      // Verify immutable snapshot contains historical data at application time
      expect(insertedPayload.profile_snapshot).toMatchObject({
        fullName: "Aashutosh Jha",
        email: "aashutosh@example.com",
        phone: "+9779800000000",
      });
      expect(insertedPayload.education_snapshot).toEqual(mockProfile.education_history);
      expect(insertedPayload.experience_snapshot).toEqual(mockProfile.experience_history);
      expect(insertedPayload.skills_snapshot).toEqual(mockProfile.skills);
      expect(insertedPayload.training_snapshot).toEqual(mockProfile.certifications);
      expect(insertedPayload.resume_url_snapshot).toBe(mockProfile.resume_url);
      expect(insertedPayload.status).toBe("applied");
      expect(insertedPayload.timeline).toHaveLength(1);
      expect(insertedPayload.timeline[0].status).toBe("applied");
    });

    it("prevents duplicate active applications for the same job", async () => {
      const mockJob = {
        id: "job-uuid-1",
        title: "Electrical Engineer",
        is_active: true,
        status: "published",
        application_deadline: new Date(Date.now() + 86400000).toISOString(),
      };

      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === "jobs") {
            return {
              select: () => ({
                eq: () => ({
                  is: () => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-uuid-1" }, error: null }),
                }),
              }),
            };
          }
          if (table === "job_applications") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    is: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "app-existing", status: "screening" }, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      mocks.adminClient.mockReturnValue(mockDb);

      await expect(
        submitJobApplication({
          userId: "user-uuid-1",
          jobId: "job-uuid-1",
          fullName: "Aashutosh Jha",
          email: "aashutosh@example.com",
          phone: "+9779800000000",
        })
      ).rejects.toThrow("You have already applied for this job position.");
    });
  });

  describe("3. Student Interview Calendar Integration", () => {
    it("returns candidate interview schedules with associated job and company data", async () => {
      const mockInterviews = [
        {
          id: "app-1",
          job_id: "job-1",
          status: "interview",
          interview_at: "2026-10-15T10:00:00Z",
          interview_location: "Kathmandu Office / Google Meet",
          interview_duration_minutes: 45,
          interview_type: "online",
          interview_notes: "Bring your portfolio and project demos",
          interview_status: "scheduled",
          job: {
            id: "job-1",
            title: "Frontend Developer",
            location: "Kathmandu",
            company: {
              id: "comp-1",
              name: "Tech Solutions Nepal",
              logo_url: "https://example.com/logo.png",
            },
          },
        },
      ];

      const mockDb = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              not: () => ({
                is: () => ({
                  order: vi.fn().mockResolvedValue({ data: mockInterviews, error: null }),
                }),
              }),
            }),
          }),
        })),
      };

      mocks.adminClient.mockReturnValue(mockDb);

      const interviews = await getStudentInterviews("user-uuid-1");
      expect(interviews).toHaveLength(1);
      expect(interviews[0].interview_type).toBe("online");
      expect(interviews[0].job.title).toBe("Frontend Developer");
      expect(interviews[0].interview_location).toContain("Google Meet");
    });
  });
});
