import { z } from "zod";
import { getModuleFormDefinition } from "./module-form-definitions";
import type {
  ModuleFormField,
  ModuleFormType,
  ModuleFormValues,
} from "./module-form-types";

const storagePath = /^(?:[a-zA-Z0-9][a-zA-Z0-9._-]*\/)*[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const phoneCharacters = /^[+]?[-()\s\d]{7,20}$/;
const calendarDate = /^\d{4}-\d{2}-\d{2}$/;
const clockTime = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$|^(?:0?[1-9]|1[0-2]):[0-5]\d\s?(?:AM|PM)$/i;

const normalizeClockTime = (value: string) => {
  const twelveHour = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i.exec(value);
  if (!twelveHour) return value;
  let hour = Number(twelveHour[1]) % 12;
  if (twelveHour[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${twelveHour[2]}`;
};

const isValidCalendarDate = (value: string) => {
  if (!calendarDate.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const isSafeFileReference = (value: string) => {
  if (value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }

  return (
    storagePath.test(value) &&
    value.split("/").every((segment) => segment !== "." && segment !== "..")
  );
};

const optionalize = (schema: z.ZodTypeAny, field: ModuleFormField) => {
  if (field.required) return schema;

  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    schema.optional(),
  );
};

const textSchema = (field: ModuleFormField) => {
  let schema = z.string().trim();
  if (field.minLength !== undefined) schema = schema.min(field.minLength);
  if (field.maxLength !== undefined) schema = schema.max(field.maxLength);
  if (field.required && field.minLength === undefined) schema = schema.min(1);
  return schema;
};

const fieldSchema = (field: ModuleFormField): z.ZodTypeAny => {
  switch (field.type) {
    case "email":
      return optionalize(textSchema(field).email().transform((value) => value.toLowerCase()), field);
    case "tel":
      return optionalize(
        textSchema(field)
          .regex(phoneCharacters, "Enter a valid phone number")
          .refine((value) => {
            const digitCount = value.replace(/\D/g, "").length;
            return digitCount >= 7 && digitCount <= 15;
          }, "Enter a valid phone number"),
        field,
      );
    case "url":
      return optionalize(
        textSchema(field).url().refine((value) => {
          try {
            const protocol = new URL(value).protocol;
            return protocol === "https:" || protocol === "http:";
          } catch {
            return false;
          }
        }, "Only HTTP or HTTPS URLs are allowed"),
        field,
      );
    case "file_reference":
      return optionalize(
        textSchema(field).refine(isSafeFileReference, "Enter a valid uploaded file reference"),
        field,
      );
    case "number": {
      let schema = z.number().finite();
      if (field.min !== undefined) schema = schema.min(field.min);
      if (field.max !== undefined) schema = schema.max(field.max);
      if (field.step === 1) schema = schema.int();
      return optionalize(schema, field);
    }
    case "date":
      return optionalize(
        textSchema(field)
          .regex(calendarDate, "Use YYYY-MM-DD format")
          .refine(isValidCalendarDate, "Enter a valid date"),
        field,
      );
    case "time":
      return optionalize(
        textSchema(field)
          .regex(clockTime, "Enter a valid time")
          .transform(normalizeClockTime),
        field,
      );
    case "select": {
      const allowed = new Set(field.options?.map((option) => option.value) ?? []);
      return optionalize(
        textSchema(field).refine((value) => allowed.has(value), "Choose a valid option"),
        field,
      );
    }
    case "multiselect": {
      let schema = z.array(z.string().trim().min(1).max(100));
      if (field.required) schema = schema.min(1, "Add at least one skill");
      if (field.max !== undefined) schema = schema.max(field.max);
      return optionalize(schema, field);
    }
    case "checkbox": {
      const schema = field.mustBeTrue
        ? z.literal(true, { errorMap: () => ({ message: "This field must be accepted" }) })
        : z.boolean();
      return optionalize(schema, field);
    }
    case "hidden":
      return optionalize(z.string().uuid("Enter a valid resource identifier"), field);
    case "text":
    case "textarea":
      return optionalize(textSchema(field), field);
  }
};

export const createModuleFormSchema = (module: ModuleFormType) => {
  const definition = getModuleFormDefinition(module);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of definition.fields) {
    shape[field.key] = fieldSchema(field);
  }

  // Strict parsing is intentional: clients cannot smuggle server-owned fields
  // such as userId, amount, payment status, approval status, or lead ownership.
  return z.object(shape).strict();
};

export interface ModuleFormValidationSuccess {
  success: true;
  data: ModuleFormValues;
}

export interface ModuleFormValidationFailure {
  success: false;
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
}

export type ModuleFormValidationResult =
  | ModuleFormValidationSuccess
  | ModuleFormValidationFailure;

export const validateModuleForm = (
  module: ModuleFormType,
  values: unknown,
): ModuleFormValidationResult => {
  const parsed = createModuleFormSchema(module).safeParse(values);

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const flattened = parsed.error.flatten();
  return {
    success: false,
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors,
  };
};
