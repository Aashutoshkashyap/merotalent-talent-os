import type {
  ModuleFormDefinition,
  ModuleFormType,
  ModuleFormValues,
} from "./module-form-types";

interface ApiEnvelope<T> {
  data: T | null;
  error: {
    code?: string;
    message?: string;
    fields?: Record<string, string[]>;
  } | null;
}

export interface ModuleSubmissionResult {
  id: string;
  status: string;
  leadId?: string;
  paymentId?: string;
  createdAt?: string;
}

export class ModuleFormClientError extends Error {
  readonly code?: string;
  readonly fields: Record<string, string[]>;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    code?: string,
    fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ModuleFormClientError";
    this.code = code;
    this.fields = fields;
    this.status = status;
  }
}

const readEnvelope = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ModuleFormClientError(
      "The server returned an unreadable response. Please try again.",
      response.status || 500,
    );
  }
};

export const fetchModuleFormDefinition = async (
  module: ModuleFormType,
  signal?: AbortSignal,
): Promise<ModuleFormDefinition> => {
  const response = await fetch(`/api/v1/forms/${module}`, { signal });
  const payload = await readEnvelope<ModuleFormDefinition>(response);

  if (!response.ok || !payload.data) {
    throw new ModuleFormClientError(
      payload.error?.message || "This form is temporarily unavailable.",
      response.status,
      payload.error?.code,
      payload.error?.fields,
    );
  }

  return payload.data;
};

export const submitAuthenticatedModuleForm = async ({
  accessToken,
  idempotencyKey = crypto.randomUUID(),
  module,
  values,
}: {
  accessToken: string;
  idempotencyKey?: string;
  module: ModuleFormType;
  values: ModuleFormValues;
}): Promise<ModuleSubmissionResult> => {
  if (!accessToken) {
    throw new ModuleFormClientError(
      "Sign in again before submitting this form.",
      401,
      "AUTH_REQUIRED",
    );
  }

  const response = await fetch(`/api/v1/submissions/${module}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(values),
  });
  const payload = await readEnvelope<ModuleSubmissionResult>(response);

  if (!response.ok || !payload.data) {
    throw new ModuleFormClientError(
      payload.error?.message || "The form could not be submitted. Please try again.",
      response.status,
      payload.error?.code,
      payload.error?.fields,
    );
  }

  return payload.data;
};
