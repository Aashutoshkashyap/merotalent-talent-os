import { getModuleFormDefinition } from "./module-form-definitions";
import { validateModuleForm } from "./module-form-validation";
import type { ModuleFormType, ModuleFormValues } from "./module-form-types";

export interface FormSubmissionActor {
  id: string;
  email?: string;
}

export interface FormSubmissionCommand {
  module: ModuleFormType;
  formVersion: number;
  actor: FormSubmissionActor;
  targetId: string;
  values: ModuleFormValues;
  idempotencyKey?: string;
}

export interface FormSubmissionResult {
  id: string;
  leadId?: string;
  paymentId?: string;
  status: string;
  createdAt?: string;
}

export interface FormSubmissionGateway {
  submit(command: FormSubmissionCommand): Promise<FormSubmissionResult>;
}

export class ModuleFormValidationError extends Error {
  readonly fieldErrors: Record<string, string[]>;
  readonly formErrors: string[];

  constructor(fieldErrors: Record<string, string[]>, formErrors: string[]) {
    super("The submitted form is invalid.");
    this.name = "ModuleFormValidationError";
    this.fieldErrors = fieldErrors;
    this.formErrors = formErrors;
  }
}

const idempotencyKeyPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;
const mediaObjectNamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:pdf|doc|docx)$/i;

const isCanonicalJobDocument = (
  value: unknown,
  actorId: string,
  jobId: string,
) => {
  if (typeof value !== "string") return false;
  const parts = value.split("/");
  return (
    parts.length === 4 &&
    parts[0] === actorId &&
    parts[1] === "job_attachment" &&
    parts[2] === jobId &&
    mediaObjectNamePattern.test(parts[3])
  );
};

export const submitModuleForm = async (
  module: ModuleFormType,
  values: unknown,
  actor: FormSubmissionActor,
  gateway: FormSubmissionGateway,
  idempotencyKey?: string,
): Promise<FormSubmissionResult> => {
  const validated = validateModuleForm(module, values);
  if (validated.success === false) {
    throw new ModuleFormValidationError(
      validated.fieldErrors,
      validated.formErrors,
    );
  }

  if (idempotencyKey && !idempotencyKeyPattern.test(idempotencyKey)) {
    throw new ModuleFormValidationError(
      {},
      ["The Idempotency-Key header is invalid."],
    );
  }

  const definition = getModuleFormDefinition(module);
  const targetId = validated.data[definition.targetField];
  if (typeof targetId !== "string") {
    throw new ModuleFormValidationError(
      { [definition.targetField]: ["A target resource is required."] },
      [],
    );
  }

  if (
    module === "job_application" &&
    !isCanonicalJobDocument(validated.data.resumeUrl, actor.id, targetId)
  ) {
    throw new ModuleFormValidationError(
      {
        resumeUrl: [
          "Upload the resume through the secure job-application media endpoint before submitting.",
        ],
      },
      [],
    );
  }

  if (module === "job_application") {
    for (const field of ["experienceLetterUrl", "trainingDocumentUrl"] as const) {
      const path = validated.data[field];
      if (path !== undefined && !isCanonicalJobDocument(path, actor.id, targetId)) {
        throw new ModuleFormValidationError(
          { [field]: ["Upload the document through the secure job-application media endpoint before submitting."] },
          [],
        );
      }
    }
  }

  return gateway.submit({
    module,
    formVersion: definition.version,
    actor,
    targetId,
    values: validated.data,
    idempotencyKey,
  });
};
