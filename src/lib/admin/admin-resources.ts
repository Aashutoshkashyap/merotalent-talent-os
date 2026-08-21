export const ADMIN_RESOURCE_NAMES = [
  "users",
  "user-roles",
  "user-permissions",
  "colleges",
  "mentors",
  "partnered-courses",
  "jobs",
  "job-applications",
  "events",
  "event-registrations",
  "college-applications",
  "mentor-bookings",
  "leads",
  "access-requests",
  "packages",
  "subscriptions",
  "payments",
  "advertisements",
  "featured-items",
  "notifications",
] as const;

export type AdminResourceName = (typeof ADMIN_RESOURCE_NAMES)[number];

export type AdminFieldKind =
  | "string"
  | "email"
  | "url"
  | "uuid"
  | "number"
  | "integer"
  | "boolean"
  | "timestamp"
  | "date"
  | "string_array"
  | "json";

export interface AdminWriteField {
  kind: AdminFieldKind;
  create?: boolean;
  update?: boolean;
  requiredOnCreate?: boolean;
  nullable?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  values?: readonly string[];
  requireHttps?: boolean;
  allowedHosts?: readonly string[];
}

export interface AdminFilterDefinition {
  column: string;
  kind: "string" | "uuid" | "boolean";
  values?: readonly string[];
}

export interface AdminResourceDefinition {
  resource: AdminResourceName;
  table: string;
  select: string;
  searchColumn?: string;
  sortColumns: readonly string[];
  defaultSort: string;
  filters: Readonly<Record<string, AdminFilterDefinition>>;
  fields: Readonly<Record<string, AdminWriteField>>;
  scope?: Readonly<Record<string, string | boolean>>;
  softDelete?:
    | { mode: "timestamp"; column: string; patch?: Readonly<Record<string, unknown>> }
    | { mode: "value"; column: string; value: string | boolean; patch?: Readonly<Record<string, unknown>> };
  deletable: boolean;
  hardDelete?: boolean;
  creatable?: boolean;
}

const text = (options: Partial<AdminWriteField> = {}): AdminWriteField => ({
  kind: "string",
  maxLength: 5_000,
  ...options,
});

const uuid = (options: Partial<AdminWriteField> = {}): AdminWriteField => ({
  kind: "uuid",
  ...options,
});

const timestamp = (options: Partial<AdminWriteField> = {}): AdminWriteField => ({
  kind: "timestamp",
  ...options,
});

const number = (options: Partial<AdminWriteField> = {}): AdminWriteField => ({
  kind: "number",
  ...options,
});

const commonStatusFilter: AdminFilterDefinition = {
  column: "status",
  kind: "string",
};

const resources = {
  users: {
    resource: "users",
    table: "profiles",
    select: "id,user_id,email,full_name,avatar_url,phone,bio,location,account_status,onboarding_completed,created_at,updated_at,deleted_at",
    searchColumn: "email",
    sortColumns: ["email", "full_name", "account_status", "created_at", "updated_at"],
    defaultSort: "created_at",
    filters: {
      account_status: { column: "account_status", kind: "string", values: ["pending", "active", "suspended", "deactivated"] },
      user_id: { column: "user_id", kind: "uuid" },
    },
    fields: {
      user_id: uuid({ create: false, update: false }),
      // Login email belongs to Supabase Auth and must only change through a
      // dedicated Auth Admin/reverification workflow.
      email: { kind: "email", create: false, update: false },
      full_name: text({ create: false, update: true, nullable: true, maxLength: 180 }),
      avatar_url: { kind: "url", create: false, update: true, nullable: true },
      phone: text({ create: false, update: true, nullable: true, maxLength: 30 }),
      bio: text({ create: false, update: true, nullable: true, maxLength: 5_000 }),
      location: text({ create: false, update: true, nullable: true, maxLength: 240 }),
      account_status: text({
        create: false,
        // Access state belongs to the dedicated Auth Admin workflow, which
        // applies self-lockout and last-active-admin safeguards atomically.
        update: false,
        maxLength: 40,
        values: ["pending", "active", "suspended", "deactivated"],
      }),
      onboarding_completed: { kind: "boolean", create: false, update: true },
    },
    softDelete: {
      mode: "timestamp",
      column: "deleted_at",
      patch: { account_status: "deactivated" },
    },
    creatable: false,
    // Profile deletion/deactivation must stay synchronized with Supabase Auth
    // through /api/v1/admin/auth-users rather than this generic CRUD route.
    deletable: false,
  },
  "user-roles": {
    resource: "user-roles",
    table: "user_roles",
    select: "id,user_id,role,created_at",
    sortColumns: ["role", "created_at"],
    defaultSort: "created_at",
    filters: {
      user_id: { column: "user_id", kind: "uuid" },
      role: {
        column: "role",
        kind: "string",
        values: ["admin", "talent", "institution", "company", "mentor"],
      },
    },
    fields: {
      user_id: uuid({ create: true, update: false, requiredOnCreate: true }),
      role: text({
        create: true,
        update: true,
        requiredOnCreate: true,
        maxLength: 40,
        values: ["admin", "talent", "institution", "company", "mentor"],
      }),
    },
    deletable: true,
    hardDelete: true,
  },
  "user-permissions": {
    resource: "user-permissions",
    table: "user_permissions",
    select: "id,user_id,permission_id,granted_by,expires_at,created_at",
    sortColumns: ["expires_at", "created_at"],
    defaultSort: "created_at",
    filters: {
      user_id: { column: "user_id", kind: "uuid" },
      permission_id: { column: "permission_id", kind: "uuid" },
      granted_by: { column: "granted_by", kind: "uuid" },
    },
    fields: {
      user_id: uuid({ create: true, update: false, requiredOnCreate: true }),
      permission_id: uuid({ create: true, update: false, requiredOnCreate: true }),
      expires_at: timestamp({ create: true, update: true, nullable: true }),
    },
    deletable: true,
    hardDelete: true,
  },
  colleges: {
    resource: "colleges",
    table: "institutes",
    select: "id,owner_user_id,name,short_name,slug,type,description,logo_url,cover_image_url,gallery_urls,youtube_url,website,location,contact_email,contact_phone,contact_info,courses_offered,total_seats,available_seats,admission_status,admission_deadline,is_verified,is_featured,featured_until,ranking,status,created_at,updated_at,deleted_at",
    searchColumn: "name",
    sortColumns: ["name", "ranking", "created_at", "updated_at"],
    defaultSort: "created_at",
    filters: {
      status: commonStatusFilter,
      type: { column: "type", kind: "string" },
      is_verified: { column: "is_verified", kind: "boolean" },
      is_featured: { column: "is_featured", kind: "boolean" },
      owner_user_id: { column: "owner_user_id", kind: "uuid" },
    },
    fields: {
      owner_user_id: uuid({ create: true, update: true, requiredOnCreate: true }),
      name: text({ create: true, update: true, requiredOnCreate: true, maxLength: 180 }),
      short_name: text({ create: true, update: true, nullable: true, maxLength: 40 }),
      slug: text({ create: true, update: true, nullable: true, maxLength: 180 }),
      type: text({ create: true, update: true, maxLength: 60 }),
      description: text({ create: true, update: true, nullable: true, maxLength: 10_000 }),
      logo_url: { kind: "url", create: true, update: true, nullable: true },
      cover_image_url: { kind: "url", create: true, update: true, nullable: true },
      gallery_urls: { kind: "string_array", create: true, update: true, max: 30 },
      youtube_url: { kind: "url", create: true, update: true, nullable: true },
      website: { kind: "url", create: true, update: true, nullable: true },
      location: text({ create: true, update: true, nullable: true, maxLength: 240 }),
      contact_email: { kind: "email", create: true, update: true, nullable: true },
      contact_phone: text({ create: true, update: true, nullable: true, maxLength: 30 }),
      contact_info: { kind: "json", create: true, update: true },
      courses_offered: { kind: "json", create: true, update: true },
      total_seats: { kind: "integer", create: true, update: true, nullable: true, min: 0 },
      available_seats: { kind: "integer", create: true, update: true, nullable: true, min: 0 },
      admission_status: text({ create: true, update: true, nullable: true, maxLength: 40 }),
      admission_deadline: timestamp({ create: true, update: true, nullable: true }),
      is_verified: { kind: "boolean", create: false, update: false },
      is_featured: { kind: "boolean", create: true, update: true },
      featured_until: timestamp({ create: true, update: true, nullable: true }),
      ranking: { kind: "integer", create: true, update: true, nullable: true, min: 0 },
      status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["draft", "pending", "approved", "suspended", "rejected"],
      }),
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  mentors: {
    resource: "mentors",
    table: "mentors",
    select: "id,user_id,headline,description,profile_image_url,cover_image_url,expertise,hourly_rate,is_available,availability,timezone,years_experience,rating,total_sessions,approval_status,commission_rate,is_featured,created_at,updated_at,deleted_at",
    sortColumns: ["rating", "hourly_rate", "created_at", "updated_at"],
    defaultSort: "created_at",
    filters: {
      approval_status: { column: "approval_status", kind: "string" },
      is_available: { column: "is_available", kind: "boolean" },
      is_featured: { column: "is_featured", kind: "boolean" },
      user_id: { column: "user_id", kind: "uuid" },
    },
    fields: {
      user_id: uuid({ create: true, update: true, requiredOnCreate: true }),
      headline: text({ create: true, update: true, nullable: true, maxLength: 240 }),
      description: text({ create: true, update: true, nullable: true, maxLength: 10_000 }),
      profile_image_url: { kind: "url", create: true, update: true, nullable: true },
      cover_image_url: { kind: "url", create: true, update: true, nullable: true },
      expertise: { kind: "string_array", create: true, update: true, max: 50 },
      hourly_rate: number({ create: true, update: true, nullable: true, min: 0, max: 10_000_000 }),
      is_available: { kind: "boolean", create: true, update: true },
      availability: { kind: "json", create: true, update: true },
      timezone: text({ create: true, update: true, maxLength: 80 }),
      years_experience: { kind: "integer", create: true, update: true, nullable: true, min: 0, max: 100 },
      approval_status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["pending", "approved", "rejected", "suspended"],
      }),
      commission_rate: number({ create: true, update: true, min: 0, max: 100 }),
      is_featured: { kind: "boolean", create: true, update: true },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  "partnered-courses": {
    resource: "partnered-courses",
    table: "courses",
    select: "id,title,description,category,thumbnail_url,redirect_url,partner_name,partner_id,is_partnered,display_order,referral_code,status,is_published,created_by,created_at,updated_at,deleted_at",
    searchColumn: "title",
    sortColumns: ["title", "display_order", "created_at", "updated_at"],
    defaultSort: "created_at",
    scope: { is_partnered: true },
    filters: {
      category: { column: "category", kind: "string" },
      status: commonStatusFilter,
      is_partnered: { column: "is_partnered", kind: "boolean" },
      is_published: { column: "is_published", kind: "boolean" },
    },
    fields: {
      title: text({ create: true, update: true, requiredOnCreate: true, maxLength: 240 }),
      description: text({ create: true, update: true, nullable: true, maxLength: 10_000 }),
      category: text({ create: true, update: true, nullable: true, maxLength: 120 }),
      thumbnail_url: { kind: "url", create: true, update: true, nullable: true },
      redirect_url: {
        kind: "url",
        create: true,
        update: true,
        requiredOnCreate: true,
        requireHttps: true,
        allowedHosts: ["learn.merotalent.com"],
      },
      partner_name: text({ create: true, update: true, nullable: true, maxLength: 180 }),
      partner_id: uuid({ create: true, update: true, nullable: true }),
      is_partnered: { kind: "boolean", create: false, update: false },
      display_order: { kind: "integer", create: true, update: true, min: 0 },
      referral_code: text({ create: true, update: true, nullable: true, maxLength: 120 }),
      status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["draft", "pending", "published", "inactive"],
      }),
      is_published: { kind: "boolean", create: false, update: false },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  jobs: {
    resource: "jobs",
    table: "jobs",
    select: "id,company_id,owner_user_id,title,description,requirements,skills_required,location,job_type,experience_level,salary_min,salary_max,is_remote,is_active,status,approval_status,approved_by,approved_at,rejection_reason,application_deadline,expires_at,external_link,is_featured,created_at,updated_at,deleted_at",
    searchColumn: "title",
    sortColumns: ["title", "application_deadline", "created_at", "updated_at"],
    defaultSort: "created_at",
    filters: {
      status: commonStatusFilter,
      approval_status: { column: "approval_status", kind: "string" },
      company_id: { column: "company_id", kind: "uuid" },
      owner_user_id: { column: "owner_user_id", kind: "uuid" },
      is_active: { column: "is_active", kind: "boolean" },
    },
    fields: {
      company_id: uuid({ create: true, update: true, nullable: true }),
      owner_user_id: uuid({ create: true, update: true, requiredOnCreate: true }),
      title: text({ create: true, update: true, requiredOnCreate: true, maxLength: 240 }),
      description: text({ create: true, update: true, nullable: true, maxLength: 20_000 }),
      requirements: { kind: "string_array", create: true, update: true, nullable: true, max: 100 },
      skills_required: { kind: "string_array", create: true, update: true, nullable: true, max: 100 },
      location: text({ create: true, update: true, nullable: true, maxLength: 240 }),
      job_type: text({ create: true, update: true, maxLength: 60 }),
      experience_level: text({ create: true, update: true, maxLength: 60 }),
      salary_min: number({ create: true, update: true, nullable: true, min: 0 }),
      salary_max: number({ create: true, update: true, nullable: true, min: 0 }),
      is_remote: { kind: "boolean", create: true, update: true },
      is_active: { kind: "boolean", create: false, update: false },
      status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["draft", "pending_approval", "published", "rejected", "closed", "expired"],
      }),
      approval_status: text({
        create: false,
        update: false,
        maxLength: 40,
        values: ["pending", "approved", "rejected"],
      }),
      rejection_reason: text({ create: true, update: true, nullable: true, maxLength: 2_000 }),
      application_deadline: timestamp({ create: true, update: true, nullable: true }),
      expires_at: timestamp({ create: true, update: true, nullable: true }),
      external_link: { kind: "url", create: true, update: true, nullable: true },
      is_featured: { kind: "boolean", create: true, update: true },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  "job-applications": {
    resource: "job-applications",
    table: "job_applications",
    select: "id,job_id,user_id,full_name,email,phone,resume_url,cover_letter,portfolio_url,skills_match_score,status,notes,form_data,applied_at,updated_at,deleted_at",
    searchColumn: "email",
    sortColumns: ["status", "applied_at", "updated_at"],
    defaultSort: "applied_at",
    filters: {
      status: commonStatusFilter,
      job_id: { column: "job_id", kind: "uuid" },
      user_id: { column: "user_id", kind: "uuid" },
    },
    fields: {
      status: text({
        create: false,
        update: true,
        maxLength: 40,
        values: ["submitted", "screening", "interview", "offered", "rejected", "withdrawn"],
      }),
      notes: text({ create: false, update: true, nullable: true, maxLength: 5_000 }),
      skills_match_score: { kind: "integer", create: false, update: true, nullable: true, min: 0, max: 100 },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    creatable: false,
    deletable: true,
  },
  events: {
    resource: "events",
    table: "events",
    select: "id,organizer_user_id,organizer_type,organizer_id,title,slug,description,event_type,format,location,meeting_url,cover_image_url,start_date,end_date,registration_deadline,capacity,ticket_price,currency,status,approval_status,is_active,approved_by,approved_at,rejection_reason,is_featured,created_at,updated_at,deleted_at",
    searchColumn: "title",
    sortColumns: ["title", "start_date", "created_at", "updated_at"],
    defaultSort: "start_date",
    filters: {
      status: commonStatusFilter,
      approval_status: { column: "approval_status", kind: "string" },
      organizer_user_id: { column: "organizer_user_id", kind: "uuid" },
      event_type: { column: "event_type", kind: "string" },
      is_featured: { column: "is_featured", kind: "boolean" },
    },
    fields: {
      organizer_user_id: uuid({ create: true, update: true, requiredOnCreate: true }),
      organizer_type: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["user", "college", "mentor", "company"],
      }),
      organizer_id: uuid({ create: true, update: true, nullable: true }),
      title: text({ create: true, update: true, requiredOnCreate: true, maxLength: 240 }),
      slug: text({ create: true, update: true, nullable: true, maxLength: 180 }),
      description: text({ create: true, update: true, nullable: true, maxLength: 20_000 }),
      event_type: text({ create: true, update: true, maxLength: 60, values: ["free", "paid"] }),
      format: text({ create: true, update: true, maxLength: 40, values: ["online", "offline", "hybrid"] }),
      location: text({ create: true, update: true, nullable: true, maxLength: 240 }),
      meeting_url: { kind: "url", create: true, update: true, nullable: true },
      start_date: timestamp({ create: true, update: true, requiredOnCreate: true }),
      end_date: timestamp({ create: true, update: true, requiredOnCreate: true }),
      registration_deadline: timestamp({ create: true, update: true, nullable: true }),
      ticket_price: number({ create: true, update: true, min: 0 }),
      currency: text({ create: true, update: true, maxLength: 3 }),
      capacity: { kind: "integer", create: true, update: true, nullable: true, min: 1 },
      status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["draft", "pending_approval", "approved", "published", "rejected", "cancelled", "completed"],
      }),
      approval_status: text({
        create: false,
        update: false,
        maxLength: 40,
        values: ["pending", "approved", "rejected"],
      }),
      is_active: { kind: "boolean", create: false, update: false },
      rejection_reason: text({ create: true, update: true, nullable: true, maxLength: 2_000 }),
      cover_image_url: { kind: "url", create: true, update: true, nullable: true },
      is_featured: { kind: "boolean", create: true, update: true },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  "event-registrations": {
    resource: "event-registrations",
    table: "event_registrations",
    select: "id,event_id,user_id,status,payment_status,ticket_quantity,total_amount,payment_id,form_data,registered_at,updated_at,deleted_at",
    sortColumns: ["status", "payment_status", "registered_at", "updated_at"],
    defaultSort: "registered_at",
    filters: {
      status: commonStatusFilter,
      payment_status: { column: "payment_status", kind: "string" },
      event_id: { column: "event_id", kind: "uuid" },
      user_id: { column: "user_id", kind: "uuid" },
    },
    fields: {
      status: text({
        create: false,
        update: true,
        maxLength: 40,
        values: ["pending", "confirmed", "cancelled", "attended", "refunded"],
      }),
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    creatable: false,
    deletable: true,
  },
  "college-applications": {
    resource: "college-applications",
    table: "college_applications",
    select: "id,institute_id,applicant_id,full_name,email,phone,program_interest,intake,message,attachments,form_data,status,submitted_at,updated_at,deleted_at",
    searchColumn: "email",
    sortColumns: ["status", "submitted_at", "updated_at"],
    defaultSort: "submitted_at",
    filters: {
      status: commonStatusFilter,
      institute_id: { column: "institute_id", kind: "uuid" },
      applicant_id: { column: "applicant_id", kind: "uuid" },
    },
    fields: {
      status: text({
        create: false,
        update: true,
        maxLength: 40,
        values: ["submitted", "reviewing", "contacted", "accepted", "rejected", "withdrawn"],
      }),
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    creatable: false,
    deletable: true,
  },
  "mentor-bookings": {
    resource: "mentor-bookings",
    table: "mentor_bookings",
    select: "id,mentor_id,mentor_service_id,student_id,scheduled_start,scheduled_end,status,payment_status,amount,currency,payment_id,notes,form_data,created_at,updated_at,deleted_at",
    sortColumns: ["status", "payment_status", "scheduled_start", "created_at", "updated_at"],
    defaultSort: "scheduled_start",
    filters: {
      status: commonStatusFilter,
      payment_status: { column: "payment_status", kind: "string" },
      mentor_id: { column: "mentor_id", kind: "uuid" },
      student_id: { column: "student_id", kind: "uuid" },
    },
    fields: {
      status: text({
        create: false,
        update: true,
        maxLength: 40,
        values: ["pending", "confirmed", "declined", "completed", "cancelled", "no_show"],
      }),
      notes: text({ create: false, update: true, nullable: true, maxLength: 5_000 }),
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    creatable: false,
    deletable: true,
  },
  leads: {
    resource: "leads",
    table: "leads",
    select: "id,source_type,source_id,owner_user_id,organization_type,organization_id,applicant_user_id,status,payload,created_at,updated_at,deleted_at",
    sortColumns: ["status", "source_type", "created_at", "updated_at"],
    defaultSort: "created_at",
    filters: {
      status: commonStatusFilter,
      source_type: { column: "source_type", kind: "string" },
      owner_user_id: { column: "owner_user_id", kind: "uuid" },
      applicant_user_id: { column: "applicant_user_id", kind: "uuid" },
    },
    fields: {
      status: text({
        create: false,
        update: true,
        maxLength: 40,
        values: ["new", "viewed", "contacted", "qualified", "converted", "closed"],
      }),
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    creatable: false,
    deletable: true,
  },
  "access-requests": {
    resource: "access-requests",
    table: "sub_admin_requests",
    select: "id,user_id,user_name,user_email,requested_modules,reason,status,created_at,updated_at",
    sortColumns: ["status", "created_at"],
    defaultSort: "created_at",
    filters: {
      status: { column: "status", kind: "string", values: ["pending", "approved", "rejected", "suspended"] },
      user_id: { column: "user_id", kind: "uuid" },
    },
    fields: {
      status: text({
        create: false,
        update: true,
        maxLength: 40,
        values: ["pending", "approved", "rejected", "suspended"],
      }),
    },
    creatable: false,
    deletable: true,
  },
  packages: {
    resource: "packages",
    table: "packages",
    select: "id,code,name,description,audience,price,currency,billing_interval,features,lead_access_mode,is_active,sort_order,package_kind,module_scope,is_default_free,duration_days,is_publicly_selectable,created_at,updated_at,deleted_at",
    searchColumn: "name",
    sortColumns: ["name", "price", "sort_order", "package_kind", "duration_days", "created_at", "updated_at"],
    defaultSort: "created_at",
    filters: {
      audience: { column: "audience", kind: "string" },
      is_active: { column: "is_active", kind: "boolean" },
      package_kind: {
        column: "package_kind",
        kind: "string",
        values: ["free", "paid", "complimentary"],
      },
      lead_access_mode: {
        column: "lead_access_mode",
        kind: "string",
        values: ["none", "read_only", "full"],
      },
      is_default_free: { column: "is_default_free", kind: "boolean" },
      is_publicly_selectable: { column: "is_publicly_selectable", kind: "boolean" },
    },
    fields: {
      code: text({ create: true, update: true, requiredOnCreate: true, maxLength: 80 }),
      name: text({ create: true, update: true, requiredOnCreate: true, maxLength: 180 }),
      description: text({ create: true, update: true, nullable: true, maxLength: 5_000 }),
      audience: text({
        create: true,
        update: true,
        nullable: true,
        maxLength: 40,
        values: ["admin", "talent", "institution", "company", "mentor"],
      }),
      price: number({ create: true, update: true, requiredOnCreate: true, min: 0 }),
      currency: text({ create: true, update: true, maxLength: 3 }),
      billing_interval: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["one_time", "month", "quarter", "year"],
      }),
      features: { kind: "json", create: true, update: true },
      lead_access_mode: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["none", "read_only", "full"],
      }),
      package_kind: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["free", "paid", "complimentary"],
      }),
      module_scope: {
        kind: "string_array",
        create: true,
        update: true,
        max: 6,
        values: ["student", "college", "mentor", "jobs", "events", "partnered_courses"],
      },
      is_default_free: { kind: "boolean", create: true, update: true },
      duration_days: { kind: "integer", create: true, update: true, nullable: true, min: 1, max: 3650 },
      is_publicly_selectable: { kind: "boolean", create: true, update: true },
      is_active: { kind: "boolean", create: true, update: true },
      sort_order: { kind: "integer", create: true, update: true, min: 0 },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  subscriptions: {
    resource: "subscriptions",
    table: "subscriptions",
    select: "id,user_id,package_id,entity_type,entity_id,start_date,expiry_date,status,payment_status,auto_renew,cancelled_at,cancellation_reason,metadata,created_at,updated_at,deleted_at",
    sortColumns: ["start_date", "expiry_date", "created_at", "updated_at"],
    defaultSort: "created_at",
    filters: {
      status: commonStatusFilter,
      payment_status: { column: "payment_status", kind: "string" },
      user_id: { column: "user_id", kind: "uuid" },
      package_id: { column: "package_id", kind: "uuid" },
    },
    fields: {
      user_id: uuid({ create: true, update: false, requiredOnCreate: true }),
      package_id: uuid({ create: true, update: true, requiredOnCreate: true }),
      entity_type: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["user", "college", "mentor", "company", "organizer"],
      }),
      entity_id: uuid({ create: true, update: true, nullable: true }),
      start_date: timestamp({ create: true, update: true, requiredOnCreate: true }),
      expiry_date: timestamp({ create: true, update: true, requiredOnCreate: true }),
      status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["pending", "trialing", "active", "past_due", "expired", "cancelled"],
      }),
      payment_status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["pending", "success", "failed", "refunded", "not_required"],
      }),
      auto_renew: { kind: "boolean", create: true, update: true },
      cancelled_at: timestamp({ create: false, update: false, nullable: true }),
      cancellation_reason: text({ create: true, update: true, nullable: true, maxLength: 2_000 }),
      metadata: { kind: "json", create: true, update: true },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  payments: {
    resource: "payments",
    table: "payments",
    select: "id,user_id,payment_type,reference_id,subscription_id,amount,currency,status,payment_method,gateway,transaction_id,gateway_transaction_id,paid_at,failed_at,failure_reason,refunded_at,metadata,created_at,updated_at,deleted_at",
    sortColumns: ["amount", "status", "created_at", "updated_at"],
    defaultSort: "created_at",
    filters: {
      status: commonStatusFilter,
      payment_type: { column: "payment_type", kind: "string" },
      user_id: { column: "user_id", kind: "uuid" },
      gateway: { column: "gateway", kind: "string" },
    },
    fields: {
      user_id: uuid({ create: true, update: false, requiredOnCreate: true }),
      payment_type: text({ create: true, update: false, requiredOnCreate: true, maxLength: 60 }),
      reference_id: uuid({ create: true, update: false, requiredOnCreate: true }),
      amount: number({ create: true, update: false, requiredOnCreate: true, min: 0 }),
      currency: text({ create: true, update: false, maxLength: 3 }),
      status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["pending", "success", "failed", "refunded"],
      }),
      payment_method: text({ create: true, update: true, nullable: true, maxLength: 60 }),
      gateway: text({ create: true, update: true, nullable: true, maxLength: 60 }),
      transaction_id: text({ create: true, update: true, nullable: true, maxLength: 240 }),
      gateway_transaction_id: text({ create: true, update: true, nullable: true, maxLength: 240 }),
      subscription_id: uuid({ create: true, update: true, nullable: true }),
      paid_at: timestamp({ create: false, update: false, nullable: true }),
      failed_at: timestamp({ create: false, update: false, nullable: true }),
      failure_reason: text({ create: true, update: true, nullable: true, maxLength: 2_000 }),
      refunded_at: timestamp({ create: false, update: false, nullable: true }),
      metadata: { kind: "json", create: true, update: true, nullable: true },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  advertisements: {
    resource: "advertisements",
    table: "advertisements",
    select: "id,title,placement,image_url,destination_url,target_url,sponsor_name,start_date,end_date,priority,target_locations,status,is_active,impressions,clicks,metadata,created_by,created_at,updated_at,deleted_at",
    searchColumn: "title",
    sortColumns: ["priority", "start_date", "end_date", "created_at", "updated_at"],
    defaultSort: "priority",
    filters: {
      status: commonStatusFilter,
      placement: { column: "placement", kind: "string" },
      is_active: { column: "is_active", kind: "boolean" },
    },
    fields: {
      title: text({ create: true, update: true, requiredOnCreate: true, maxLength: 180 }),
      placement: text({ create: true, update: true, requiredOnCreate: true, maxLength: 80 }),
      image_url: { kind: "url", create: true, update: true, requiredOnCreate: true },
      destination_url: { kind: "url", create: true, update: true, nullable: true },
      sponsor_name: text({ create: true, update: true, nullable: true, maxLength: 180 }),
      start_date: timestamp({ create: true, update: true, requiredOnCreate: true }),
      end_date: timestamp({ create: true, update: true, requiredOnCreate: true }),
      priority: { kind: "integer", create: true, update: true, min: 0 },
      target_locations: { kind: "string_array", create: true, update: true, max: 100 },
      status: text({
        create: true,
        update: true,
        maxLength: 40,
        values: ["draft", "scheduled", "active", "paused", "expired"],
      }),
      is_active: { kind: "boolean", create: false, update: false },
      metadata: { kind: "json", create: true, update: true },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  "featured-items": {
    resource: "featured-items",
    table: "featured_items",
    select: "id,entity_type,entity_id,title,placement,priority,start_date,end_date,is_active,metadata,created_by,created_at,updated_at,deleted_at",
    sortColumns: ["priority", "start_date", "created_at", "updated_at"],
    defaultSort: "priority",
    filters: {
      entity_type: { column: "entity_type", kind: "string" },
      placement: { column: "placement", kind: "string" },
      is_active: { column: "is_active", kind: "boolean" },
    },
    fields: {
      entity_type: text({
        create: true,
        update: true,
        requiredOnCreate: true,
        maxLength: 40,
        values: ["college", "mentor", "course", "job", "event"],
      }),
      entity_id: uuid({ create: true, update: true, requiredOnCreate: true }),
      title: text({ create: true, update: true, nullable: true, maxLength: 240 }),
      placement: text({ create: true, update: true, requiredOnCreate: true, maxLength: 80 }),
      priority: { kind: "integer", create: true, update: true, min: 0 },
      start_date: timestamp({ create: true, update: true, nullable: true }),
      end_date: timestamp({ create: true, update: true, nullable: true }),
      is_active: { kind: "boolean", create: true, update: true },
      metadata: { kind: "json", create: true, update: true },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
  notifications: {
    resource: "notifications",
    table: "notifications",
    select: "id,sender_id,recipient_id,title,message,type,category,channel,status,entity_type,entity_id,email_to,is_read,read_at,sent_at,action_url,metadata,created_at,deleted_at",
    searchColumn: "title",
    sortColumns: ["created_at", "is_read"],
    defaultSort: "created_at",
    filters: {
      status: commonStatusFilter,
      recipient_id: { column: "recipient_id", kind: "uuid" },
      category: { column: "category", kind: "string" },
      type: { column: "type", kind: "string" },
      is_read: { column: "is_read", kind: "boolean" },
    },
    fields: {
      sender_id: uuid({ create: false, update: false, nullable: true }),
      recipient_id: uuid({ create: true, update: false, requiredOnCreate: true }),
      title: text({ create: true, update: true, requiredOnCreate: true, maxLength: 240 }),
      message: text({ create: true, update: true, requiredOnCreate: true, maxLength: 5_000 }),
      type: text({ create: true, update: true, maxLength: 40 }),
      category: text({ create: true, update: true, maxLength: 60 }),
      channel: text({ create: true, update: true, maxLength: 40, values: ["dashboard", "email"] }),
      status: text({ create: true, update: true, maxLength: 40, values: ["queued", "sent", "failed", "read"] }),
      entity_type: text({ create: true, update: true, nullable: true, maxLength: 60 }),
      entity_id: uuid({ create: true, update: true, nullable: true }),
      email_to: { kind: "email", create: true, update: true, nullable: true },
      is_read: { kind: "boolean", create: false, update: false },
      read_at: timestamp({ create: false, update: false, nullable: true }),
      action_url: { kind: "url", create: true, update: true, nullable: true },
      metadata: { kind: "json", create: true, update: true },
    },
    softDelete: { mode: "timestamp", column: "deleted_at" },
    deletable: true,
  },
} as const satisfies Record<AdminResourceName, AdminResourceDefinition>;

export const isAdminResourceName = (value: string): value is AdminResourceName =>
  Object.prototype.hasOwnProperty.call(resources, value);

export const getAdminResource = (
  resource: AdminResourceName,
): AdminResourceDefinition => resources[resource];
