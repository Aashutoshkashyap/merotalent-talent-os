import type { ModuleFormType } from "@/lib/forms/module-form-types";

export interface StudentApplicationProfile {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  education?: string | null;
}

const hasValue = (value: string | null | undefined, minimum = 1) =>
  typeof value === "string" && value.trim().length >= minimum;
const hasValidPhone = (value: string | null | undefined) => {
  const phone = value?.trim() || "";
  const digits = phone.replace(/\D/g, "");
  return /^[+]?[-()\s\d]{7,20}$/.test(phone) && digits.length >= 7 && digits.length <= 15;
};

export function missingStudentProfileFields(
  module: ModuleFormType,
  profile: StudentApplicationProfile | null,
  accountEmail?: string | null,
): string[] {
  const missing: string[] = [];
  if (!hasValue(profile?.full_name, 2) || (profile?.full_name?.trim().length || 0) > 120) missing.push("full name");
  if (!hasValue(accountEmail)) missing.push("email");
  if (!hasValidPhone(profile?.phone)) missing.push("valid phone number");
  if (!hasValue(profile?.location)) missing.push("location");
  if (["college_application", "job_application"].includes(module) && !hasValue(profile?.education)) {
    missing.push("education");
  }
  return missing;
}

export function valuesFromStudentProfile(
  module: ModuleFormType,
  values: unknown,
  profile: StudentApplicationProfile,
  accountEmail?: string | null,
): unknown {
  if (!values || typeof values !== "object" || Array.isArray(values)) return values;
  const submitted = values as Record<string, unknown>;
  return {
    ...submitted,
    fullName: profile.full_name?.trim(),
    email: (accountEmail || profile.email || "").trim().toLowerCase(),
    phone: profile.phone?.trim(),
    ...(module === "college_application" && !submitted.currentQualification
      ? { currentQualification: profile.education?.trim() || "" }
      : {}),
  };
}
