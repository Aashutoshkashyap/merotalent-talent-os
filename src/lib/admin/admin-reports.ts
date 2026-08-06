export const ADMIN_REPORT_NAMES = [
  "revenue",
  "applications",
  "sessions",
  "jobs",
  "events",
  "subscriptions",
] as const;

export type AdminReportName = (typeof ADMIN_REPORT_NAMES)[number];
export type AdminReportFormat = "json" | "csv" | "xlsx";

export interface AdminReportColumn {
  key: string;
  label: string;
  kind?: "text" | "number" | "timestamp";
}

export interface AdminReportDefinition {
  report: AdminReportName;
  table: string;
  select: string;
  dateColumn: string;
  orderColumn: string;
  columns: readonly AdminReportColumn[];
  fixedFilters?: Readonly<Record<string, string | readonly string[]>>;
}

const reports = {
  revenue: {
    report: "revenue",
    table: "payments",
    select: "id,transaction_id,user_id,payment_type,reference_id,amount,currency,status,payment_method,gateway,created_at",
    dateColumn: "created_at",
    orderColumn: "created_at",
    fixedFilters: { status: "success" },
    columns: [
      { key: "transaction_id", label: "Transaction ID" },
      { key: "user_id", label: "User ID" },
      { key: "payment_type", label: "Payment Type" },
      { key: "reference_id", label: "Reference ID" },
      { key: "amount", label: "Amount", kind: "number" },
      { key: "currency", label: "Currency" },
      { key: "status", label: "Status" },
      { key: "payment_method", label: "Payment Method" },
      { key: "gateway", label: "Gateway" },
      { key: "created_at", label: "Created At", kind: "timestamp" },
    ],
  },
  applications: {
    report: "applications",
    table: "leads",
    select: "id,source_type,source_id,organization_type,organization_id,applicant_user_id,status,created_at",
    dateColumn: "created_at",
    orderColumn: "created_at",
    fixedFilters: { source_type: ["college_application", "job_application"] },
    columns: [
      { key: "id", label: "Lead ID" },
      { key: "source_type", label: "Application Type" },
      { key: "source_id", label: "Application ID" },
      { key: "organization_type", label: "Owner Type" },
      { key: "organization_id", label: "Owner ID" },
      { key: "applicant_user_id", label: "Applicant User ID" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created At", kind: "timestamp" },
    ],
  },
  sessions: {
    report: "sessions",
    table: "mentor_bookings",
    select: "id,mentor_id,student_id,status,payment_status,amount,currency,scheduled_start,scheduled_end,created_at",
    dateColumn: "scheduled_start",
    orderColumn: "scheduled_start",
    columns: [
      { key: "id", label: "Booking ID" },
      { key: "mentor_id", label: "Mentor ID" },
      { key: "student_id", label: "Student ID" },
      { key: "status", label: "Status" },
      { key: "payment_status", label: "Payment Status" },
      { key: "amount", label: "Amount", kind: "number" },
      { key: "currency", label: "Currency" },
      { key: "scheduled_start", label: "Starts At", kind: "timestamp" },
      { key: "scheduled_end", label: "Ends At", kind: "timestamp" },
      { key: "created_at", label: "Created At", kind: "timestamp" },
    ],
  },
  jobs: {
    report: "jobs",
    table: "jobs",
    select: "id,title,owner_user_id,company_id,status,is_active,application_deadline,expires_at,created_at",
    dateColumn: "created_at",
    orderColumn: "created_at",
    columns: [
      { key: "id", label: "Job ID" },
      { key: "title", label: "Title" },
      { key: "owner_user_id", label: "Owner User ID" },
      { key: "company_id", label: "Company ID" },
      { key: "status", label: "Status" },
      { key: "is_active", label: "Active" },
      { key: "application_deadline", label: "Application Deadline", kind: "timestamp" },
      { key: "expires_at", label: "Expires At", kind: "timestamp" },
      { key: "created_at", label: "Created At", kind: "timestamp" },
    ],
  },
  events: {
    report: "events",
    table: "events",
    select: "id,title,organizer_user_id,status,approval_status,is_active,start_date,end_date,created_at",
    dateColumn: "start_date",
    orderColumn: "start_date",
    columns: [
      { key: "id", label: "Event ID" },
      { key: "title", label: "Title" },
      { key: "organizer_user_id", label: "Organizer User ID" },
      { key: "status", label: "Status" },
      { key: "approval_status", label: "Approval Status" },
      { key: "is_active", label: "Active" },
      { key: "start_date", label: "Starts At", kind: "timestamp" },
      { key: "end_date", label: "Ends At", kind: "timestamp" },
      { key: "created_at", label: "Created At", kind: "timestamp" },
    ],
  },
  subscriptions: {
    report: "subscriptions",
    table: "subscriptions",
    select: "id,user_id,package_id,status,payment_status,start_date,expiry_date,created_at",
    dateColumn: "start_date",
    orderColumn: "start_date",
    columns: [
      { key: "id", label: "Subscription ID" },
      { key: "user_id", label: "User ID" },
      { key: "package_id", label: "Package ID" },
      { key: "status", label: "Status" },
      { key: "payment_status", label: "Payment Status" },
      { key: "start_date", label: "Start Date", kind: "timestamp" },
      { key: "expiry_date", label: "Expiry Date", kind: "timestamp" },
      { key: "created_at", label: "Created At", kind: "timestamp" },
    ],
  },
} as const satisfies Record<AdminReportName, AdminReportDefinition>;

export const isAdminReportName = (value: string): value is AdminReportName =>
  Object.prototype.hasOwnProperty.call(reports, value);

export const getAdminReport = (
  report: AdminReportName,
): AdminReportDefinition => reports[report];
