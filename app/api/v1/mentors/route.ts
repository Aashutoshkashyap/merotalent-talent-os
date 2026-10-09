import { jsonApiResponse } from "@/lib/server/api-response";
import { listPublicMentors } from "@/lib/server/mentorship-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
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
