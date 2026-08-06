export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function readJsonObject(
  request: Request,
  maxBodyBytes = 16 * 1024,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new ApiRequestError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "The request must use application/json.",
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > maxBodyBytes
  ) {
    throw new ApiRequestError(
      413,
      "PAYLOAD_TOO_LARGE",
      "The request payload is too large.",
    );
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    throw new ApiRequestError(
      400,
      "INVALID_JSON",
      "The request body must be valid JSON.",
    );
  }

  if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
    throw new ApiRequestError(
      413,
      "PAYLOAD_TOO_LARGE",
      "The request payload is too large.",
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new ApiRequestError(
      400,
      "INVALID_JSON",
      "The request body must be valid JSON.",
    );
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiRequestError(
      422,
      "INVALID_PAYLOAD",
      "The request body must be a JSON object.",
    );
  }

  return value as Record<string, unknown>;
}
