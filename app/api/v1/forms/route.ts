import { listModuleFormDefinitions } from "@/lib/forms/module-form-definitions";
import { jsonApiResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();

  return jsonApiResponse(
    {
      data: listModuleFormDefinitions(),
      error: null,
      meta: { requestId },
    },
    200,
  );
}
