import { authenticateAdminRequest } from "@/lib/server/auth";
import { jsonApiResponse } from "@/lib/server/api-response";
import {
  getAdminReport,
  isAdminReportName,
} from "@/lib/admin/admin-reports";
import {
  exportAdminReport,
  parseAdminReportQuery,
  type AdminReportRow,
} from "@/lib/admin/admin-report-service";
import {
  adminApiErrorResponse,
  throwDatabaseError,
} from "@/lib/admin/admin-route-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ report: string }>;
}

const nextDate = (date: string) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};

const reportSummary = (report: string, rows: readonly AdminReportRow[]) => {
  if (report !== "revenue") return { pageRowCount: rows.length };
  const pageTotalsByCurrency: Record<string, number> = {};
  for (const row of rows) {
    if (typeof row.amount !== "number") continue;
    const currency = typeof row.currency === "string" ? row.currency : "UNKNOWN";
    pageTotalsByCurrency[currency] =
      (pageTotalsByCurrency[currency] ?? 0) + row.amount;
  }
  return { pageRowCount: rows.length, pageTotalsByCurrency };
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  let authenticated;
  try {
    authenticated = await authenticateAdminRequest(request);
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "authenticate admin report");
  }

  const { report } = await context.params;
  if (!isAdminReportName(report)) {
    return jsonApiResponse(
      {
        data: null,
        error: { code: "REPORT_NOT_FOUND", message: "The requested report does not exist." },
        meta: { requestId },
      },
      404,
    );
  }

  const definition = getAdminReport(report);
  try {
    const { userClient } = authenticated;
    const options = parseAdminReportQuery(new URL(request.url).searchParams);
    let query = userClient.from(definition.table).select(definition.select);

    if (options.from) query = query.gte(definition.dateColumn, options.from);
    if (options.to) query = query.lt(definition.dateColumn, nextDate(options.to));
    for (const [column, value] of Object.entries(definition.fixedFilters ?? {})) {
      query = Array.isArray(value)
        ? query.in(column, [...value])
        : query.eq(column, value);
    }

    const { data, error } = await query
      .order(definition.orderColumn, { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);
    if (error) throwDatabaseError(error);
    const rows = (data ?? []) as unknown as AdminReportRow[];

    if (options.format === "json") {
      return jsonApiResponse(
        {
          data: {
            report,
            rows,
            summary: reportSummary(report, rows),
          },
          error: null,
          meta: {
            requestId,
            from: options.from ?? null,
            to: options.to ?? null,
            limit: options.limit,
            page: options.page,
            truncated: rows.length === options.limit,
          },
        },
        200,
      );
    }

    const exported = exportAdminReport(definition, rows, options.format);
    const fileDate = new Date().toISOString().slice(0, 10);
    return new Response(exported.body, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="merotalent-${report}-${fileDate}-page-${options.page}.${exported.extension}"`,
        "Content-Type": exported.contentType,
        "X-Content-Type-Options": "nosniff",
        "X-Export-Implementation": exported.implementation,
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    return adminApiErrorResponse(error, requestId, `export ${report} report`);
  }
}
