import { describe, expect, it, vi } from "vitest";
import {
  getModuleFormDefinition,
  listModuleFormDefinitions,
} from "./module-form-definitions";
import { validateModuleForm } from "./module-form-validation";
import { submitModuleForm } from "./submission-service";

const uuid = "11111111-1111-4111-8111-111111111111";
const jobUuid = "22222222-2222-4222-8222-222222222222";
const objectUuid = "33333333-3333-4333-8333-333333333333";

describe("module form definitions", () => {
  it("reuses the common contact contract for every module", () => {
    for (const definition of listModuleFormDefinitions()) {
      expect(definition.fields.map((field) => field.key)).toEqual(
        expect.arrayContaining(["fullName", "email", "phone"]),
      );
    }
  });

  it("adds only the fields relevant to each workflow", () => {
    expect(
      getModuleFormDefinition("college_application").fields.map((field) => field.key),
    ).toContain("intendedCourse");
    expect(
      getModuleFormDefinition("job_application").fields.map((field) => field.key),
    ).toContain("resumeUrl");
    expect(
      getModuleFormDefinition("mentor_booking").fields.map((field) => field.key),
    ).toContain("scheduledTime");
    expect(
      getModuleFormDefinition("event_registration").fields.map((field) => field.key),
    ).toContain("attendeeCount");
  });
});

describe("module form validation", () => {
  it("normalizes valid input", () => {
    const result = validateModuleForm("college_application", {
      collegeId: uuid,
      fullName: "  Maya Rai  ",
      email: "Maya@Example.com",
      phone: "+977 9812345678",
      message: "  Please share the intake dates.  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("Maya Rai");
      expect(result.data.email).toBe("maya@example.com");
      expect(result.data.message).toBe("Please share the intake dates.");
    }
  });

  it("rejects unexpected server-owned fields", () => {
    const result = validateModuleForm("college_application", {
      collegeId: uuid,
      fullName: "Maya Rai",
      email: "maya@example.com",
      phone: "+977 9812345678",
      status: "approved",
      userId: uuid,
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.formErrors.join(" ")).toContain("Unrecognized key");
    }
  });

  it("rejects fields that belong to another module", () => {
    const result = validateModuleForm("college_application", {
      collegeId: uuid,
      fullName: "Maya Rai",
      email: "maya@example.com",
      phone: "+977 9812345678",
      resumeUrl: "maya/resume.pdf",
    });

    expect(result.success).toBe(false);
  });

  it("requires explicit event consent", () => {
    const result = validateModuleForm("event_registration", {
      eventId: uuid,
      fullName: "Maya Rai",
      email: "maya@example.com",
      phone: "+977 9812345678",
      attendeeCount: 1,
      consent: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unsafe file references and impossible dates", () => {
    const jobResult = validateModuleForm("job_application", {
      jobId: uuid,
      fullName: "Maya Rai",
      email: "maya@example.com",
      phone: "+977 9812345678",
      resumeUrl: "../private/resume.pdf",
    });
    const mentorResult = validateModuleForm("mentor_booking", {
      mentorId: uuid,
      fullName: "Maya Rai",
      email: "maya@example.com",
      phone: "+977 9812345678",
      scheduledDate: "2027-02-31",
      scheduledTime: "09:00 AM",
      durationMinutes: "60",
      topic: "Career planning",
      paymentMethod: "khalti",
    });

    expect(jobResult.success).toBe(false);
    expect(mentorResult.success).toBe(false);
  });

  it("normalizes mentor booking times for database scheduling", () => {
    const result = validateModuleForm("mentor_booking", {
      mentorId: uuid,
      fullName: "Maya Rai",
      email: "maya@example.com",
      phone: "+977 9812345678",
      scheduledDate: "2027-06-20",
      scheduledTime: "02:30 PM",
      durationMinutes: "60",
      topic: "Career planning",
      paymentMethod: "khalti",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scheduledTime).toBe("14:30");
  });
});

describe("submission service", () => {
  const jobValues = {
    jobId: jobUuid,
    fullName: "Maya Rai",
    email: "maya@example.com",
    phone: "+977 9812345678",
    resumeUrl: `${uuid}/job_attachment/${jobUuid}/${objectUuid}.pdf`,
    skills: ["Customer service", "React"],
  };

  it("allows experience, training and salary to be omitted", () => {
    expect(validateModuleForm("job_application", jobValues).success).toBe(true);
  });

  it("persists optional job details in the submission command", async () => {
    const submit = vi.fn().mockResolvedValue({ id: uuid, status: "submitted" });
    const values = {
      ...jobValues,
      expectedSalary: 45000,
      experienceSummary: "Two years in customer service",
      experienceLetterUrl: jobValues.resumeUrl,
      trainingSummary: "Professional communication workshop",
      trainingDocumentUrl: jobValues.resumeUrl,
    };
    await submitModuleForm("job_application", values, { id: uuid }, { submit });
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ values: expect.objectContaining(values) }));
  });

  it.each(["experienceLetterUrl", "trainingDocumentUrl"])("rejects another job's %s", async (field) => {
    const submit = vi.fn();
    await expect(submitModuleForm("job_application", {
      ...jobValues,
      [field]: `${uuid}/job_attachment/${uuid}/${objectUuid}.pdf`,
    }, { id: uuid }, { submit })).rejects.toMatchObject({ fieldErrors: { [field]: expect.any(Array) } });
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects empty skills, negative salary and oversized descriptions", () => {
    for (const invalid of [{ skills: [] }, { expectedSalary: -1 }, { experienceSummary: "x".repeat(2001) }, { trainingSummary: "x".repeat(2001) }]) {
      expect(validateModuleForm("job_application", { ...jobValues, ...invalid }).success).toBe(false);
    }
  });

  it("passes only validated values and actor identity to the gateway", async () => {
    const submit = vi.fn().mockResolvedValue({ id: uuid, status: "submitted" });
    const result = await submitModuleForm(
      "job_application",
      {
        jobId: jobUuid,
        fullName: "Maya Rai",
        email: "maya@example.com",
        phone: "+977 9812345678",
        resumeUrl: `${uuid}/job_attachment/${jobUuid}/${objectUuid}.pdf`,
        skills: ["Communication"],
      },
      { id: uuid, email: "maya@example.com" },
      { submit },
      "application:maya:001",
    );

    expect(result.status).toBe("submitted");
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "job_application",
        actor: { id: uuid, email: "maya@example.com" },
        targetId: jobUuid,
        idempotencyKey: "application:maya:001",
      }),
    );
  });

  it("rejects a job resume that is not bound to the actor and target job", async () => {
    await expect(
      submitModuleForm(
        "job_application",
        {
          jobId: jobUuid,
          fullName: "Maya Rai",
          email: "maya@example.com",
          phone: "+977 9812345678",
          resumeUrl: `${uuid}/job_attachment/${uuid}/${objectUuid}.pdf`,
          skills: ["Communication"],
        },
        { id: uuid, email: "maya@example.com" },
        { submit: vi.fn() },
      ),
    ).rejects.toMatchObject({
      fieldErrors: { resumeUrl: [expect.stringContaining("secure")] },
    });
  });
});
