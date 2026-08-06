import type {
  AdminReportDefinition,
  AdminReportFormat,
} from "./admin-reports";
import { AdminResourceValidationError } from "./admin-resource-service";

export interface AdminReportQuery {
  format: AdminReportFormat;
  from?: string;
  to?: string;
  page: number;
  limit: number;
  offset: number;
}

export type AdminReportRow = Record<string, unknown>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const validDate = (value: string) => {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const parseAdminReportQuery = (
  searchParams: URLSearchParams,
): AdminReportQuery => {
  const allowed = new Set(["format", "from", "to", "page", "limit"]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      throw new AdminResourceValidationError("The report query is invalid.", {
        [key]: ["This report parameter is not supported."],
      });
    }
    if (searchParams.getAll(key).length > 1) {
      throw new AdminResourceValidationError("The report query is invalid.", {
        [key]: ["Provide this parameter only once."],
      });
    }
  }

  const format = searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv" && format !== "xlsx") {
    throw new AdminResourceValidationError("The report query is invalid.", {
      format: ["Use json, csv, or xlsx."],
    });
  }

  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  if (from && !validDate(from)) {
    throw new AdminResourceValidationError("The report query is invalid.", {
      from: ["Use a valid YYYY-MM-DD date."],
    });
  }
  if (to && !validDate(to)) {
    throw new AdminResourceValidationError("The report query is invalid.", {
      to: ["Use a valid YYYY-MM-DD date."],
    });
  }
  if (from && to && from > to) {
    throw new AdminResourceValidationError("The report query is invalid.", {
      to: ["The end date must be on or after the start date."],
    });
  }

  const defaultLimit = format === "json" ? 500 : 5_000;
  const rawPage = searchParams.get("page");
  if (rawPage && !/^\d+$/.test(rawPage)) {
    throw new AdminResourceValidationError("The report query is invalid.", {
      page: ["Enter a whole number."],
    });
  }
  const page = rawPage ? Number(rawPage) : 1;
  if (page < 1 || page > 1_000_000) {
    throw new AdminResourceValidationError("The report query is invalid.", {
      page: ["Enter a value from 1 to 1000000."],
    });
  }
  const rawLimit = searchParams.get("limit");
  if (rawLimit && !/^\d+$/.test(rawLimit)) {
    throw new AdminResourceValidationError("The report query is invalid.", {
      limit: ["Enter a whole number."],
    });
  }
  const limit = rawLimit ? Number(rawLimit) : defaultLimit;
  if (limit < 1 || limit > 5_000) {
    throw new AdminResourceValidationError("The report query is invalid.", {
      limit: ["Enter a value from 1 to 5000."],
    });
  }

  return { format, from, to, page, limit, offset: (page - 1) * limit };
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const csvCell = (value: unknown): string => {
  let cell = displayValue(value);
  // Prevent spreadsheet applications from executing imported cells as formulas.
  if (/^[\s]*[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
};

export const serializeReportCsv = (
  definition: AdminReportDefinition,
  rows: readonly AdminReportRow[],
) => {
  const header = definition.columns.map((column) => csvCell(column.label)).join(",");
  const body = rows.map((row) =>
    definition.columns.map((column) => csvCell(row[column.key])).join(","),
  );
  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
};

const xmlText = (value: unknown) =>
  displayValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const serializeReportSpreadsheetXml = (
  definition: AdminReportDefinition,
  rows: readonly AdminReportRow[],
) => {
  const cellXml = (value: unknown, kind: AdminReportDefinition["columns"][number]["kind"] = "text") => {
    if (kind === "number" && typeof value === "number" && Number.isFinite(value)) {
      return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
    }
    if (kind === "timestamp" && typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        const excelDate = parsed.toISOString().replace(/Z$/, "");
        return `<Cell><Data ss:Type="DateTime">${excelDate}</Data></Cell>`;
      }
    }
    return `<Cell><Data ss:Type="String">${xmlText(value)}</Data></Cell>`;
  };
  const header = `<Row>${definition.columns.map((column) => cellXml(column.label)).join("")}</Row>`;
  const rowXml = (row: AdminReportRow) =>
    `<Row>${definition.columns.map((column) => cellXml(row[column.key], column.kind)).join("")}</Row>`;
  const table = [
    header,
    ...rows.map(rowXml),
  ].join("");

  // Dependency-free SpreadsheetML 2003. Excel opens this XML natively; the
  // response deliberately uses .xml rather than pretending to be an OOXML zip.
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${xmlText(definition.report)}"><Table>${table}</Table></Worksheet></Workbook>`;
};

export interface AdminReportExport {
  body: string;
  contentType: string;
  extension: string;
  implementation: "csv" | "spreadsheetml-2003";
}

export const exportAdminReport = (
  definition: AdminReportDefinition,
  rows: readonly AdminReportRow[],
  format: Exclude<AdminReportFormat, "json">,
): AdminReportExport => {
  if (format === "csv") {
    return {
      body: serializeReportCsv(definition, rows),
      contentType: "text/csv; charset=utf-8",
      extension: "csv",
      implementation: "csv",
    };
  }
  return {
    body: serializeReportSpreadsheetXml(definition, rows),
    contentType: "application/vnd.ms-excel; charset=utf-8",
    extension: "xml",
    implementation: "spreadsheetml-2003",
  };
};
