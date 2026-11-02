import { expect, it } from "vitest";
import { eventCsv } from "@/lib/events/export";
it("escapes CSV formula injection, quotes, Unicode and newlines", () => {
  const csv = eventCsv([{ name: '=HYPERLINK("bad")', note: "नमूना\nA,B", score: 10, absent: null }]);
  expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  expect(csv).toContain('"नमूना\nA,B"'); expect(csv).toContain('"10"');
  expect(eventCsv([])).toContain("No records");
});
