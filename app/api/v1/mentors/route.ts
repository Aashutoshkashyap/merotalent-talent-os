/**
 * Public mentor discovery endpoint.
 * Mode-aware: uses NeonMentorsRepository in staging, legacy mentorship-service otherwise.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { listPublicMentors } from "@/lib/server/mentorship-service";
import { NeonMentorsRepository } from "@/lib/server/neon-mentors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(request.url);

    if (getBackendMode() === "neon-staging") {
      const repo = new NeonMentorsRepository();
      const search = url.searchParams.get("query") || url.searchParams.get("search") || undefined;
      const expertise = url.searchParams.get("expertise") || url.searchParams.get("topic") || url.searchParams.get("skill") || undefined;
      const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 50;
      const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!, 10) : 0;

      const mentors = await repo.listPublicMentors({ search, expertise, limit, offset });
      return jsonApiResponse(
        { data: mentors, error: null, meta: { requestId, count: mentors.length } },
        200
      );
    }

    // Legacy path
    const query = url.searchParams.get("query") || undefined;
    const topic = url.searchParams.get("topic") || undefined;
    const skill = url.searchParams.get("skill") || undefined;
    const industry = url.searchParams.get("industry") || undefined;
    const isFree = url.searchParams.get("isFree") === "true";

    const mentors = await listPublicMentors({
      query,
      topic,
      skill,
      industry,
      isFree,
    });

    return jsonApiResponse(
      {
        data: mentors,
        error: null,
        meta: { requestId, count: mentors.length },
      },
      200
    );
  } catch (error) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "MENTOR_DISCOVERY_FAILED",
          message: error instanceof Error ? error.message : "Failed to load mentors.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
