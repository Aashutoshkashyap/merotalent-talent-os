import { describe, expect, it } from "vitest";
import { getAdminReport } from "./admin-reports";
import {
  exportAdminReport,
  parseAdminReportQuery,
  serializeReportCsv,
  serializeReportSpreadsheetXml,
} from "./admin-report-service";

describe("admin report query parsing", () => {
  it("accepts bounded JSON, CSV and Excel-compatible exports", () => {
    expect(
      parseAdminReportQuery(
        new URLSearchParams("format=xlsx&from=2026-01-01&to=2026-12-31&limit=5000"),
      ),
    ).toEqual({
      format: "xlsx",
      from: "2026-01-01",
      to: "2026-12-31",
      page: 1,
      limit: 5000,
      offset: 0,
    });
  });

  it("rejects unknown query controls and reversed dates", () => {
    expect(() =>
      parseAdminReportQuery(new URLSearchParams("select=*&format=csv")),
    ).toThrow();
    expect(() =>
      parseAdminReportQuery(
        new URLSearchParams("from=2026-12-31&to=2026-01-01"),
      ),
    ).toThrow();
  });
});

describe("admin report exporters", () => {
  const report = getAdminReport("jobs");
  const rows = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      title: "=HYPERLINK(\"https://bad.test\")",
      status: "active",
      created_at: "2026-08-06T00:00:00Z",
    },
  ];

  it("prevents CSV formula injection and quotes values", () => {
    const csv = serializeReportCsv(report, rows);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('""https://bad.test""');
  });

  it("produces escaped dependency-free SpreadsheetML", () => {
    const xml = serializeReportSpreadsheetXml(report, [
      { ...rows[0], title: "Design & <Research>" },
    ]);
    expect(xml).toContain("<?mso-application progid=\"Excel.Sheet\"?>");
    expect(xml).toContain("Design &amp; &lt;Research&gt;");
    expect(xml).not.toContain("ss:Formula");

    const exported = exportAdminReport(report, rows, "xlsx");
    expect(exported.extension).toBe("xml");
    expect(exported.implementation).toBe("spreadsheetml-2003");
  });

  it("keeps amounts numeric and timestamps date-typed in Excel exports", () => {
    const xml = serializeReportSpreadsheetXml(getAdminReport("revenue"), [
      {
        amount: 1250.5,
        currency: "NPR",
        created_at: "2026-08-06T00:00:00Z",
      },
    ]);

    expect(xml).toContain('<Data ss:Type="Number">1250.5</Data>');
    expect(xml).toContain(
      '<Data ss:Type="DateTime">2026-08-06T00:00:00.000</Data>',
    );
  });

  it("exports applicant details instead of internal lead and user IDs", () => {
    const applications = getAdminReport("applications");
    expect(applications.columns.map((column) => column.label)).toEqual(
      expect.arrayContaining(["Applicant Name", "Email", "College / Job"]),
    );
    expect(applications.columns.map((column) => column.label)).not.toEqual(
      expect.arrayContaining(["Lead ID", "Applicant User ID"]),
    );
  });
});
