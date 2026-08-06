import type {
  AdminFilterDefinition,
  AdminResourceDefinition,
  AdminWriteField,
} from "./admin-resources";

export class AdminResourceValidationError extends Error {
  readonly fields: Record<string, string[]>;

  constructor(message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "AdminResourceValidationError";
    this.fields = fields;
  }
}

export interface AdminListQuery {
  page: number;
  pageSize: number;
  offset: number;
  sortBy: string;
  ascending: boolean;
  search?: string;
  includeDeleted: boolean;
  filters: Record<string, string | boolean>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/;

const parsePositiveInteger = (
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
  field: string,
) => {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new AdminResourceValidationError("The list query is invalid.", {
      [field]: ["Enter a whole number."],
    });
  }
  const parsed = Number(value);
  if (parsed < minimum || parsed > maximum) {
    throw new AdminResourceValidationError("The list query is invalid.", {
      [field]: [`Enter a value from ${minimum} to ${maximum}.`],
    });
  }
  return parsed;
};

const parseBoolean = (value: string, field: string) => {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new AdminResourceValidationError("The list query is invalid.", {
    [field]: ["Use true or false."],
  });
};

const parseFilter = (
  value: string,
  queryKey: string,
  definition: AdminFilterDefinition,
): string | boolean => {
  if (definition.kind === "boolean") return parseBoolean(value, queryKey);
  if (definition.kind === "uuid" && !uuidPattern.test(value)) {
    throw new AdminResourceValidationError("The list query is invalid.", {
      [queryKey]: ["Enter a valid UUID."],
    });
  }
  if (value.length === 0 || value.length > 160 || /[\u0000-\u001f]/.test(value)) {
    throw new AdminResourceValidationError("The list query is invalid.", {
      [queryKey]: ["Enter a valid filter value."],
    });
  }
  if (definition.values && !definition.values.includes(value)) {
    throw new AdminResourceValidationError("The list query is invalid.", {
      [queryKey]: ["Choose an allowed filter value."],
    });
  }
  return value;
};

export const parseAdminListQuery = (
  definition: AdminResourceDefinition,
  searchParams: URLSearchParams,
): AdminListQuery => {
  const controlKeys = new Set([
    "page",
    "page_size",
    "sort_by",
    "sort_direction",
    "search",
    "include_deleted",
  ]);
  const allowedKeys = new Set([...controlKeys, ...Object.keys(definition.filters)]);

  for (const key of searchParams.keys()) {
    if (!allowedKeys.has(key)) {
      throw new AdminResourceValidationError("The list query is invalid.", {
        [key]: ["This filter is not supported."],
      });
    }
    if (searchParams.getAll(key).length > 1) {
      throw new AdminResourceValidationError("The list query is invalid.", {
        [key]: ["Provide this query parameter only once."],
      });
    }
  }

  const page = parsePositiveInteger(searchParams.get("page"), 1, 1, 10_000, "page");
  const pageSize = parsePositiveInteger(searchParams.get("page_size"), 25, 1, 100, "page_size");
  const sortBy = searchParams.get("sort_by") ?? definition.defaultSort;
  if (!definition.sortColumns.includes(sortBy)) {
    throw new AdminResourceValidationError("The list query is invalid.", {
      sort_by: ["This sort column is not supported."],
    });
  }

  const direction = searchParams.get("sort_direction") ?? "desc";
  if (direction !== "asc" && direction !== "desc") {
    throw new AdminResourceValidationError("The list query is invalid.", {
      sort_direction: ["Use asc or desc."],
    });
  }

  const search = searchParams.get("search")?.trim();
  if (search && (!definition.searchColumn || search.length > 120 || /[\u0000-\u001f]/.test(search))) {
    throw new AdminResourceValidationError("The list query is invalid.", {
      search: [definition.searchColumn ? "Search is too long or invalid." : "Search is not supported."],
    });
  }

  const includeDeletedValue = searchParams.get("include_deleted");
  const includeDeleted = includeDeletedValue
    ? parseBoolean(includeDeletedValue, "include_deleted")
    : false;
  if (includeDeleted && !definition.softDelete) {
    throw new AdminResourceValidationError("The list query is invalid.", {
      include_deleted: ["This resource does not support deleted records."],
    });
  }

  const filters: Record<string, string | boolean> = {};
  for (const [queryKey, filter] of Object.entries(definition.filters)) {
    const value = searchParams.get(queryKey);
    if (value !== null) filters[filter.column] = parseFilter(value, queryKey, filter);
  }

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    sortBy,
    ascending: direction === "asc",
    search: search || undefined,
    includeDeleted,
    filters,
  };
};

const validateDate = (value: string) => {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const validateUrl = (value: string, definition: AdminWriteField) => {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return !definition.requireHttps && !definition.allowedHosts;
  }
  try {
    const parsed = new URL(value);
    const protocolAllowed = definition.requireHttps
      ? parsed.protocol === "https:"
      : parsed.protocol === "https:" || parsed.protocol === "http:";
    const hostAllowed = !definition.allowedHosts || definition.allowedHosts.includes(parsed.hostname.toLowerCase());
    return protocolAllowed && hostAllowed && !parsed.username && !parsed.password && !parsed.port;
  } catch {
    return false;
  }
};

const validateJsonValue = (value: unknown, depth = 0): boolean => {
  if (depth > 8) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 1_000 && value.every((item) => validateJsonValue(item, depth + 1));
  if (typeof value !== "object") return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 1_000) return false;
  return entries.every(
    ([key, child]) =>
      !["__proto__", "prototype", "constructor"].includes(key) &&
      validateJsonValue(child, depth + 1),
  );
};

const invalidField = (field: string, message: string): never => {
  throw new AdminResourceValidationError("The request body is invalid.", {
    [field]: [message],
  });
};

const validateWriteValue = (
  key: string,
  value: unknown,
  definition: AdminWriteField,
): unknown => {
  if (value === null) {
    if (definition.nullable) return null;
    return invalidField(key, "This field cannot be null.");
  }

  switch (definition.kind) {
    case "string":
    case "email":
    case "url":
    case "uuid":
    case "date":
    case "timestamp": {
      if (typeof value !== "string") return invalidField(key, "Enter text.");
      const normalized = value.trim();
      if (!normalized) return invalidField(key, "This field cannot be empty.");
      if (definition.maxLength && normalized.length > definition.maxLength) {
        return invalidField(key, `Use at most ${definition.maxLength} characters.`);
      }
      if (definition.kind === "uuid" && !uuidPattern.test(normalized)) return invalidField(key, "Enter a valid UUID.");
      if (definition.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return invalidField(key, "Enter a valid email address.");
      if (definition.kind === "url" && !validateUrl(normalized, definition)) return invalidField(key, "Enter an allowed HTTP(S) or site-relative URL.");
      if (definition.kind === "date" && !validateDate(normalized)) return invalidField(key, "Use a valid YYYY-MM-DD date.");
      if (definition.kind === "timestamp" && (!timestampPattern.test(normalized) || Number.isNaN(Date.parse(normalized)))) {
        return invalidField(key, "Use an ISO timestamp with a timezone.");
      }
      if (definition.values && !definition.values.includes(normalized)) return invalidField(key, "Choose an allowed value.");
      return definition.kind === "email" ? normalized.toLowerCase() : normalized;
    }
    case "number":
    case "integer":
      if (typeof value !== "number" || !Number.isFinite(value)) return invalidField(key, "Enter a number.");
      if (definition.kind === "integer" && !Number.isInteger(value)) return invalidField(key, "Enter a whole number.");
      if (definition.min !== undefined && value < definition.min) return invalidField(key, `Enter a value of at least ${definition.min}.`);
      if (definition.max !== undefined && value > definition.max) return invalidField(key, `Enter a value no greater than ${definition.max}.`);
      return value;
    case "boolean":
      if (typeof value !== "boolean") return invalidField(key, "Use true or false.");
      return value;
    case "string_array":
      if (!Array.isArray(value)) return invalidField(key, "Enter a list of text values.");
      if (definition.max !== undefined && value.length > definition.max) return invalidField(key, `Use at most ${definition.max} values.`);
      if (!value.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 500)) {
        return invalidField(key, "Every list item must be valid text.");
      }
      return value.map((item) => (item as string).trim());
    case "json":
      if (!validateJsonValue(value)) return invalidField(key, "Enter a valid, reasonably sized JSON value.");
      return value;
  }
};

export const sanitizeAdminWrite = (
  definition: AdminResourceDefinition,
  operation: "create" | "update",
  input: unknown,
): Record<string, unknown> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AdminResourceValidationError("The request body must be a JSON object.");
  }

  const body = input as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    const field = definition.fields[key];
    if (!field || !field[operation]) {
      throw new AdminResourceValidationError("The request body is invalid.", {
        [key]: ["This field cannot be written for this resource."],
      });
    }
    output[key] = validateWriteValue(key, value, field);
  }

  if (operation === "create") {
    for (const [key, field] of Object.entries(definition.fields)) {
      if (field.requiredOnCreate && !(key in output)) {
        throw new AdminResourceValidationError("The request body is invalid.", {
          [key]: ["This field is required."],
        });
      }
    }
  }

  if (Object.keys(output).length === 0) {
    throw new AdminResourceValidationError("Provide at least one writable field.");
  }

  return output;
};

export const validateAdminResourceId = (id: string) => {
  if (!uuidPattern.test(id)) {
    throw new AdminResourceValidationError("The resource ID must be a valid UUID.", {
      id: ["Enter a valid UUID."],
    });
  }
  return id;
};
