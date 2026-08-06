import { NextResponse } from "next/server";

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiErrorBody | null;
  meta?: Record<string, unknown>;
}

export function jsonApiResponse<T>(
  body: ApiEnvelope<T>,
  status = 200,
): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
