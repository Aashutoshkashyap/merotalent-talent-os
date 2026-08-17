import { supabase } from "@/integrations/supabase/client";

interface AdminApiErrorBody {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
}

interface AdminApiEnvelope<T> {
  data: T | null;
  error: AdminApiErrorBody | null;
}

export class AdminClientError extends Error {
  constructor(
    message: string,
    readonly code = "ADMIN_REQUEST_FAILED",
    readonly status = 500,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AdminClientError";
  }
}

const getAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new AdminClientError(
      "Your administrator session has expired. Sign in again.",
      "AUTH_REQUIRED",
      401,
    );
  }
  return data.session.access_token;
};

const adminRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  let envelope: AdminApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as AdminApiEnvelope<T>;
  } catch {
    // The API is expected to return JSON; use a safe message if it does not.
  }

  if (!response.ok || envelope?.error || envelope?.data === null || !envelope) {
    throw new AdminClientError(
      envelope?.error?.message || "The administrative request could not be completed.",
      envelope?.error?.code,
      response.status,
      envelope?.error?.fields,
    );
  }

  return envelope.data;
};

export const listAdminResource = <T>(
  resource: string,
  query: Record<string, string | number | boolean> = {},
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) search.set(key, String(value));
  const suffix = search.size ? `?${search.toString()}` : "";
  return adminRequest<T[]>(`/api/v1/admin/${resource}${suffix}`);
};

export const createAdminResource = <T>(
  resource: string,
  payload: Record<string, unknown>,
) =>
  adminRequest<T>(`/api/v1/admin/${resource}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateAdminResource = <T>(
  resource: string,
  id: string,
  payload: Record<string, unknown>,
) =>
  adminRequest<T>(`/api/v1/admin/${resource}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteAdminResource = (
  resource: string,
  id: string,
) =>
  adminRequest<{ id: string; deleted: boolean }>(
    `/api/v1/admin/${resource}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

