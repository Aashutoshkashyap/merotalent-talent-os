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

type CollegeApplicationRow = {
  id: string;
  institute_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  program_interest: string | null;
  intake: string | null;
  status: string;
  submitted_at: string;
  applicant_id?: string | null;
};

type JobApplicationRow = {
  id: string;
  job_id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  applied_at: string;
};

type ApplicantProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

const safeText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : "";

/**
 * The lead ledger intentionally stores ownership and workflow metadata, not a
 * denormalized applicant directory. Build the Super Admin application export
 * from the authoritative application records instead, so CSV/XLSX files are
 * useful to people while internal IDs stay out of the standard download.
 */
const loadApplicationReportRows = async (
  userClient: unknown,
  options: ReturnType<typeof parseAdminReportQuery>,
): Promise<AdminReportRow[]> => {
  const client = userClient as any;
  let collegeQuery = client
    .from("college_applications")
    .select("id,institute_id,applicant_id,full_name,email,phone,program_interest,intake,status,submitted_at")
    .is("deleted_at", null);
  let jobQuery = client
    .from("job_applications")
    .select("id,job_id,user_id,full_name,email,phone,status,applied_at")
    .is("deleted_at", null);

  if (options.from) {
    collegeQuery = collegeQuery.gte("submitted_at", options.from);
    jobQuery = jobQuery.gte("applied_at", options.from);
  }
  if (options.to) {
    const end = nextDate(options.to);
    collegeQuery = collegeQuery.lt("submitted_at", end);
    jobQuery = jobQuery.lt("applied_at", end);
  }

  const [collegeResult, jobResult] = await Promise.all([
    collegeQuery.order("submitted_at", { ascending: false }).limit(5_000),
    jobQuery.order("applied_at", { ascending: false }).limit(5_000),
  ]);
  if (collegeResult.error) throwDatabaseError(collegeResult.error);
  if (jobResult.error) throwDatabaseError(jobResult.error);

  const collegeApplications = (collegeResult.data ?? []) as CollegeApplicationRow[];
  const jobApplications = (jobResult.data ?? []) as JobApplicationRow[];
  const instituteIds = [...new Set(collegeApplications.map((row) => row.institute_id).filter(Boolean))];
  const jobIds = [...new Set(jobApplications.map((row) => row.job_id).filter(Boolean))];
  const applicantIds = [...new Set([
    ...collegeApplications.map((row) => row.applicant_id),
    ...jobApplications.map((row) => row.user_id),
  ].filter((value): value is string => Boolean(value)))];

  const [institutesResult, jobsResult, profilesResult] = await Promise.all([
    instituteIds.length
      ? client.from("institutes").select("id,name").in("id", instituteIds)
      : Promise.resolve({ data: [], error: null }),
    jobIds.length
      ? client.from("jobs").select("id,title").in("id", jobIds)
      : Promise.resolve({ data: [], error: null }),
    applicantIds.length
      ? client.from("profiles").select("user_id,full_name,email,phone").in("user_id", applicantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (institutesResult.error) throwDatabaseError(institutesResult.error);
  if (jobsResult.error) throwDatabaseError(jobsResult.error);
  if (profilesResult.error) throwDatabaseError(profilesResult.error);

  const instituteNames = new Map(
    (institutesResult.data ?? []).map((item: { id: string; name: string }) => [item.id, safeText(item.name)]),
  );
  const jobTitles = new Map(
    (jobsResult.data ?? []).map((item: { id: string; title: string }) => [item.id, safeText(item.title)]),
  );
  const applicants = new Map<string, ApplicantProfileRow>(
    ((profilesResult.data ?? []) as ApplicantProfileRow[]).map((item) => [item.user_id, item]),
  );

  const rows: AdminReportRow[] = [
    ...collegeApplications.map((row) => {
      const profile = row.applicant_id ? applicants.get(row.applicant_id) : undefined;
      return {
        application_type: "College application",
        applicant_name: safeText(row.full_name) || safeText(profile?.full_name) || "Guest applicant",
        email: safeText(row.email) || safeText(profile?.email),
        phone: safeText(row.phone) || safeText(profile?.phone),
        target_name: instituteNames.get(row.institute_id) || "College record unavailable",
        program_or_position: safeText(row.program_interest),
        intake: safeText(row.intake),
        status: safeText(row.status),
        submitted_at: row.submitted_at,
      };
    }),
    ...jobApplications.map((row) => {
      const profile = row.user_id ? applicants.get(row.user_id) : undefined;
      return {
        application_type: "Job application",
        applicant_name: safeText(row.full_name) || safeText(profile?.full_name) || "Applicant",
        email: safeText(row.email) || safeText(profile?.email),
        phone: safeText(row.phone) || safeText(profile?.phone),
        target_name: jobTitles.get(row.job_id) || "Job record unavailable",
        program_or_position: jobTitles.get(row.job_id) || "",
        intake: "",
        status: safeText(row.status),
        submitted_at: row.applied_at,
      };
    }),
  ];

  return rows
    .sort((left, right) => String(right.submitted_at).localeCompare(String(left.submitted_at)))
    .slice(options.offset, options.offset + options.limit);
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
    let rows: AdminReportRow[];
    if (report === "applications") {
      rows = await loadApplicationReportRows(userClient, options);
    } else {
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
      rows = (data ?? []) as unknown as AdminReportRow[];
    }

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
