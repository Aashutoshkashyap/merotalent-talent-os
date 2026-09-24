import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  resolve(process.cwd(), "src/screens/institutes/InstituteDetailPage.tsx"),
  "utf8",
);

describe("college detail header layout", () => {
  it("limits cover overlap to the logo in both loaded and skeleton headers", () => {
    expect(page).not.toContain('className="-mt-14 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end"');
    expect(page).toContain('className="flex flex-col gap-4 sm:flex-row sm:items-end"');
    expect(page).toContain('className="relative z-10 -mt-14 h-28 w-28');
    expect(page).toContain('className="-mt-14 h-28 w-28');
  });
});
