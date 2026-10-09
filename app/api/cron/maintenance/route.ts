import { NextRequest } from "next/server";

import { jsonApiResponse } from "@/lib/server/api-response";
import { isValidCronAuthorization } from "@/lib/server/cron-auth";
import {
  getAdminClient,
  ServerConfigurationError,
} from "@/lib/server/supabase";
import { dispatchQueuedEmails } from "@/lib/server/email-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonResponse(body: unknown, status: number) {
  return jsonApiResponse(
    body as {
      data: unknown;
      error: { code: string; message: string } | null;
      meta?: Record<string, unknown>;
    },
    status,
  );
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron:maintenance] CRON_SECRET is not configured");
    return jsonResponse(
      {
        data: null,
        error: {
          code: "CRON_NOT_CONFIGURED",
          message: "Scheduled maintenance is not configured.",
        },
      },
      503,
    );
  }

  if (
    !isValidCronAuthorization(
      request.headers.get("authorization"),
      cronSecret,
    )
  ) {
    return jsonResponse(
      {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Valid cron authorization is required.",
        },
      },
      401,
    );
  }

  let supabase: ReturnType<typeof getAdminClient>;
  try {
    supabase = getAdminClient();
  } catch (error) {
    if (!(error instanceof ServerConfigurationError)) throw error;
    console.error(
      "[cron:maintenance] Server-side Supabase credentials are not configured",
    );
    return jsonResponse(
      {
        data: null,
        error: {
          code: "DATABASE_NOT_CONFIGURED",
          message: "Scheduled maintenance cannot reach the database.",
        },
      },
      503,
    );
  }

  let data: unknown;
  let maintenanceError: { code?: string; message?: string } | null = null;
  try {
    const result = await supabase.rpc("run_platform_maintenance");
    data = result.data;
    maintenanceError = result.error;
  } catch {
    console.error("[cron:maintenance] Database request failed before completion");
    return jsonResponse(
      {
        data: null,
        error: {
          code: "MAINTENANCE_FAILED",
          message: "Scheduled maintenance did not complete.",
        },
      },
      500,
    );
  }

  if (maintenanceError) {
    console.error("[cron:maintenance] Database maintenance failed", {
      code: maintenanceError.code,
      message: maintenanceError.message,
    });
    return jsonResponse(
      {
        data: null,
        error: {
          code: "MAINTENANCE_FAILED",
          message: "Scheduled maintenance did not complete.",
        },
      },
      500,
    );
  }

  let guestCleanup: Awaited<ReturnType<typeof supabase.rpc>>;
  try {
    guestCleanup = await supabase.rpc("prune_guest_college_verifications");
  } catch {
    console.error("[cron:maintenance] Guest verification cleanup request failed");
    return jsonResponse(
      { data: null, error: { code: "GUEST_VERIFICATION_CLEANUP_FAILED", message: "Scheduled guest verification cleanup did not complete." } },
      500,
    );
  }
  if (guestCleanup.error) {
    console.error("[cron:maintenance] Guest verification cleanup failed", { code: guestCleanup.error.code });
    return jsonResponse(
      {
        data: null,
        error: {
          code: "GUEST_VERIFICATION_CLEANUP_FAILED",
          message: "Scheduled guest verification cleanup did not complete.",
        },
      },
      500,
    );
  }

  let emailDelivery: Awaited<ReturnType<typeof dispatchQueuedEmails>>;
  try {
    emailDelivery = await dispatchQueuedEmails(25);
  } catch {
    console.error("[cron:maintenance] Transactional email dispatch failed");
    return jsonResponse(
      {
        data: null,
        error: {
          code: "EMAIL_DISPATCH_FAILED",
          message: "Scheduled email delivery did not complete.",
        },
      },
      500,
    );
  }

  return jsonResponse(
    {
      data: { ...(data && typeof data === "object" && !Array.isArray(data) ? data : {}), guestVerification: guestCleanup.data ?? {}, emailDelivery },
      error: null,
      meta: { completedAt: new Date().toISOString() },
    },
    200,
  );
}
