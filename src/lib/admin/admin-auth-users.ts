import type { User } from "@supabase/supabase-js";

import { AdminResourceValidationError } from "./admin-resource-service";

export const APP_ROLES = [
  "admin",
  "talent",
  "institution",
  "company",
  "mentor",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ACCOUNT_STATUSES = [
  "pending",
  "active",
  "suspended",
  "deactivated",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface AuthUserListQuery {
  page: number;
  pageSize: number;
}

export interface SafeAuthUserMetadata {
  fullName: string | null;
  avatarUrl: string | null;
}

export interface SafeAuthUserProfile {
  accountStatus: AccountStatus | "missing";
  deletedAt: string | null;
  metadata: SafeAuthUserMetadata;
}

export interface SafeAuthUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  emailConfirmedAt: string | null;
  invitedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  lastSignInAt: string | null;
  banned: boolean;
  bannedUntil: string | null;
  isAnonymous: boolean;
  roles: AppRole[];
  profile: SafeAuthUserProfile;
}

export interface AuthUserProfileRecord {
  user_id: string;
  account_status: string | null;
  deleted_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface InviteAuthUserInput {
  email: string;
  role: AppRole;
  metadata: {
    fullName?: string | null;
    avatarUrl?: string | null;
  };
}

export type PatchAuthUserInput =
  | {
      action: "update_identity";
      metadata: {
        fullName?: string | null;
        avatarUrl?: string | null;
      };
    }
  | {
      action: "set_access";
      role?: AppRole;
      accountStatus?: AccountStatus;
      banned?: boolean;
    };

export type DeleteAuthUserInput =
  | { action: "soft_delete" }
  | { action: "delete_auth_user"; confirmation: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

const ROLE_ALIASES: Readonly<Record<string, AppRole>> = {
  admin: "admin",
  super_admin: "admin",
  talent: "talent",
  student: "talent",
  user: "talent",
  institution: "institution",
  college: "institution",
  company: "company",
  employer: "company",
  organization: "company",
  mentor: "mentor",
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const invalid = (
  field: string,
  message: string,
  topLevelMessage = "The request body is invalid.",
): never => {
  throw new AdminResourceValidationError(topLevelMessage, {
    [field]: [message],
  });
};

const assertOnlyKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  prefix = "",
) => {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      invalid(`${prefix}${key}`, "This field is not supported.");
    }
  }
};

const normalizeEmail = (value: unknown, field = "email") => {
  if (typeof value !== "string") return invalid(field, "Enter an email address.");
  const email = value.trim().toLowerCase();
  if (
    email.length === 0 ||
    email.length > 254 ||
    CONTROL_CHARACTER_PATTERN.test(email) ||
    !EMAIL_PATTERN.test(email)
  ) {
    return invalid(field, "Enter a valid email address.");
  }
  return email;
};

const normalizeRole = (value: unknown, field = "role"): AppRole => {
  if (typeof value !== "string") return invalid(field, "Choose an allowed role.");
  const role = ROLE_ALIASES[value.trim().toLowerCase()];
  if (!role) {
    return invalid(
      field,
      "Choose admin, talent, institution, company, or mentor.",
    );
  }
  return role;
};

const normalizeAccountStatus = (value: unknown): AccountStatus => {
  if (
    typeof value !== "string" ||
    !ACCOUNT_STATUSES.includes(value as AccountStatus)
  ) {
    return invalid(
      "account_status",
      "Choose pending, active, suspended, or deactivated.",
    );
  }
  return value as AccountStatus;
};

const normalizeFullName = (value: unknown, field: string) => {
  if (value === null) return null;
  if (typeof value !== "string") return invalid(field, "Enter text or null.");
  const fullName = value.trim();
  if (
    fullName.length === 0 ||
    fullName.length > 180 ||
    CONTROL_CHARACTER_PATTERN.test(fullName)
  ) {
    return invalid(field, "Use 1 to 180 valid characters.");
  }
  return fullName;
};

const normalizeAvatarUrl = (value: unknown, field: string) => {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 2_048) {
    return invalid(field, "Enter a valid HTTPS URL or null.");
  }
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      CONTROL_CHARACTER_PATTERN.test(value)
    ) {
      return invalid(field, "Enter a valid HTTPS URL or null.");
    }
    return url.toString();
  } catch {
    return invalid(field, "Enter a valid HTTPS URL or null.");
  }
};

const normalizeMetadata = (
  value: unknown,
  required: boolean,
): InviteAuthUserInput["metadata"] | undefined => {
  if (value === undefined && !required) return undefined;
  if (!isPlainObject(value)) {
    return invalid("metadata", "Enter a JSON object.");
  }
  assertOnlyKeys(value, ["full_name", "avatar_url"], "metadata.");
  const metadata: InviteAuthUserInput["metadata"] = {};
  if ("full_name" in value) {
    metadata.fullName = normalizeFullName(value.full_name, "metadata.full_name");
  }
  if ("avatar_url" in value) {
    metadata.avatarUrl = normalizeAvatarUrl(value.avatar_url, "metadata.avatar_url");
  }
  if (required && Object.keys(metadata).length === 0) {
    invalid("metadata", "Provide at least one metadata field.");
  }
  return metadata;
};

const positiveInteger = (
  value: string | null,
  fallback: number,
  maximum: number,
  field: string,
) => {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) {
    return invalid(field, "Enter a whole number.", "The list query is invalid.");
  }
  const parsed = Number(value);
  if (parsed < 1 || parsed > maximum) {
    return invalid(
      field,
      `Enter a value from 1 to ${maximum}.`,
      "The list query is invalid.",
    );
  }
  return parsed;
};

export function parseAuthUserListQuery(
  searchParams: URLSearchParams,
): AuthUserListQuery {
  const allowed = new Set(["page", "page_size"]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      invalid(key, "This query parameter is not supported.", "The list query is invalid.");
    }
    if (searchParams.getAll(key).length > 1) {
      invalid(key, "Provide this query parameter only once.", "The list query is invalid.");
    }
  }

  return {
    page: positiveInteger(searchParams.get("page"), 1, 10_000, "page"),
    pageSize: positiveInteger(searchParams.get("page_size"), 25, 100, "page_size"),
  };
}

export function parseInviteAuthUserInput(input: unknown): InviteAuthUserInput {
  if (!isPlainObject(input)) {
    throw new AdminResourceValidationError("The request body must be a JSON object.");
  }
  assertOnlyKeys(input, ["email", "role", "metadata"]);
  if (!("email" in input)) invalid("email", "This field is required.");
  if (!("role" in input)) invalid("role", "This field is required.");

  return {
    email: normalizeEmail(input.email),
    role: normalizeRole(input.role),
    metadata: normalizeMetadata(input.metadata, false) ?? {},
  };
}

export function parsePatchAuthUserInput(input: unknown): PatchAuthUserInput {
  if (!isPlainObject(input)) {
    throw new AdminResourceValidationError("The request body must be a JSON object.");
  }
  if (input.action === "update_identity") {
    if ("email" in input || "email_confirmation" in input) {
      invalid(
        "email",
        "Administrative email replacement is disabled because it bypasses the required verification flow.",
      );
    }
    assertOnlyKeys(input, ["action", "metadata"]);
    const metadata = normalizeMetadata(input.metadata, true);
    return {
      action: "update_identity",
      metadata: metadata ?? {},
    };
  }

  if (input.action === "set_access") {
    assertOnlyKeys(input, ["action", "role", "account_status", "banned"]);
    const role = "role" in input ? normalizeRole(input.role) : undefined;
    const accountStatus =
      "account_status" in input
        ? normalizeAccountStatus(input.account_status)
        : undefined;
    let banned: boolean | undefined;
    if ("banned" in input) {
      const rawBanned = input.banned;
      if (typeof rawBanned !== "boolean") {
        invalid("banned", "Use true or false.");
      }
      banned = rawBanned as boolean;
    }
    if (role === undefined && accountStatus === undefined && banned === undefined) {
      invalid("action", "Provide a role, account_status, or banned value.");
    }
    return {
      action: "set_access",
      ...(role !== undefined ? { role } : {}),
      ...(accountStatus !== undefined ? { accountStatus } : {}),
      ...(banned !== undefined ? { banned } : {}),
    };
  }

  return invalid("action", "Choose update_identity or set_access.");
}

export function parseDeleteAuthUserInput(
  input: unknown,
  userId: string,
): DeleteAuthUserInput {
  if (input === undefined) return { action: "soft_delete" };
  if (!isPlainObject(input)) {
    throw new AdminResourceValidationError("The request body must be a JSON object.");
  }
  if (input.action === "soft_delete") {
    assertOnlyKeys(input, ["action"]);
    return { action: "soft_delete" };
  }
  if (input.action === "delete_auth_user") {
    assertOnlyKeys(input, ["action", "confirmation"]);
    const expected = `DELETE ${userId}`;
    if (input.confirmation !== expected) {
      return invalid(
        "confirmation",
        `Enter ${expected} to permanently delete this Auth user.`,
      );
    }
    return { action: "delete_auth_user", confirmation: expected };
  }
  return invalid("action", "Choose soft_delete or delete_auth_user.");
}

const safeMetadataString = (value: unknown) =>
  typeof value === "string" && value.length <= 2_048 ? value : null;

const safeMetadataUrl = (value: unknown) => {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const canonicalRoles = (roles: readonly string[]): AppRole[] => {
  const allowed = new Set<string>(APP_ROLES);
  return [...new Set(roles.filter((role): role is AppRole => allowed.has(role)))];
};

export function sanitizeAuthUser(
  user: User,
  profile?: AuthUserProfileRecord | null,
  roles: readonly string[] = [],
  now = Date.now(),
): SafeAuthUser {
  const rawMetadata = isPlainObject(user.user_metadata) ? user.user_metadata : {};
  const bannedUntil = user.banned_until ?? null;
  const parsedBannedUntil = bannedUntil ? Date.parse(bannedUntil) : Number.NaN;
  const accountStatus = ACCOUNT_STATUSES.includes(
    profile?.account_status as AccountStatus,
  )
    ? (profile?.account_status as AccountStatus)
    : "missing";

  return {
    id: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    emailConfirmedAt: user.email_confirmed_at ?? null,
    invitedAt: user.invited_at ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    banned: Number.isFinite(parsedBannedUntil) && parsedBannedUntil > now,
    bannedUntil,
    isAnonymous: user.is_anonymous === true,
    roles: canonicalRoles(roles),
    profile: {
      accountStatus,
      deletedAt: profile?.deleted_at ?? null,
      metadata: {
        fullName:
          profile?.full_name ?? safeMetadataString(rawMetadata.full_name),
        avatarUrl:
          safeMetadataUrl(profile?.avatar_url) ?? safeMetadataUrl(rawMetadata.avatar_url),
      },
    },
  };
}

export function buildMergedAuthMetadata(
  current: unknown,
  patch: NonNullable<Extract<PatchAuthUserInput, { action: "update_identity" }>["metadata"]>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  if (isPlainObject(current)) {
    for (const [key, value] of Object.entries(current)) {
      if (!["__proto__", "prototype", "constructor"].includes(key)) {
        next[key] = value;
      }
    }
  }
  if ("fullName" in patch) next.full_name = patch.fullName;
  if ("avatarUrl" in patch) next.avatar_url = patch.avatarUrl;
  return next;
}
