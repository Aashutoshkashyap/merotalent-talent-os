import {
  getModuleFormDefinition,
  isModuleFormType,
} from "@/lib/forms/module-form-definitions";
import { jsonApiResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ module: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { module } = await context.params;
  const requestId = crypto.randomUUID();

  if (!isModuleFormType(module)) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "FORM_MODULE_NOT_FOUND",
          message: "The requested form module does not exist.",
        },
        meta: { requestId },
      },
      404,
    );
  }

  return jsonApiResponse(
    {
      data: getModuleFormDefinition(module),
      error: null,
      meta: { requestId },
    },
    200,
  );
}
