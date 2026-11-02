export const eventExportKinds = ["participants", "enrollments", "attempts", "assignments", "evaluations", "certificates"] as const;
/** Quoted, spreadsheet-safe UTF-8 CSV. No provider secrets or ticket bearer tokens belong here. */
export function eventCsv(rows: Record<string, unknown>[]) {
  const columns = rows.length ? Object.keys(rows[0]) : ["No records"];
  const cell = (value: unknown) => {
    const text = value == null ? "" : value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [columns.map(cell).join(","), ...rows.map(row => columns.map(key => cell(row[key])).join(","))].join("\r\n");
}
