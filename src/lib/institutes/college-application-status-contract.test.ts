import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  COLLEGE_APPLICATION_COLUMNS,
  COLLEGE_APPLICATION_STATUSES,
} from "./college-application-status";

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const migration = readSource(
  "supabase/migrations/20260806090000_modular_platform_backend.sql",
);

/** Source files that read or write `college_applications` from the client. */
const CLIENT_SOURCES = [
  "src/screens/institute/InstituteDashboard.tsx",
  "src/screens/admin/AdminApplications.tsx",
  "src/screens/dashboard/Colleges.tsx",
  "src/hooks/useStudentActivity.ts",
] as const;

/** Statuses the UI used to write that the CHECK constraint rejects. */
const RETIRED_STATUSES = ["followed_up", "admitted"] as const;

/**
 * Names the UI invented that appear nowhere in supabase/migrations, so they are
 * banned anywhere in these files — not just inside a query chain, since the CSV
 * export referenced one while mapping rows rather than while selecting them.
 */
const INVENTED_COLUMNS = [
  "target_program",
  "education_level",
  "previous_institution",
  "previous_gpa_stream",
  "temporary_address",
  "permanent_address",
] as const;

/**
 * Columns that are real on some other table but absent from
 * college_applications, so they are only banned inside a query chain against
 * this table.
 */
const FOREIGN_COLUMNS = ["institute_name", "user_id"] as const;

const collegeApplicationsTable = (() => {
  const start = migration.indexOf(
    "CREATE TABLE IF NOT EXISTS public.college_applications (",
  );
  expect(start).toBeGreaterThan(-1);
  const end = migration.indexOf("\n);", start);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
})();

/**
 * Pulls out each `.from("college_applications")` query chain so assertions
 * apply only to this table and not to unrelated queries in the same file.
 */
const collegeApplicationQueries = (source: string): string[] => {
  const chains: string[] = [];
  const marker = 'from("college_applications")';
  let index = source.indexOf(marker);

  while (index !== -1) {
    const chainStart = index + marker.length;
    // A chain ends at the first statement terminator or the next `.from("`,
    // whichever comes first, so unrelated code is never scanned.
    const candidates = [
      source.indexOf(";", chainStart),
      source.indexOf(",\n", chainStart),
      source.indexOf('from("', chainStart),
    ].filter((position) => position !== -1);
    const chainEnd = candidates.length > 0 ? Math.min(...candidates) : source.length;
    chains.push(source.slice(chainStart, chainEnd));
    index = source.indexOf(marker, chainStart);
  }

  return chains;
};

describe("college application status vocabulary", () => {
  it("matches the database CHECK constraint exactly", () => {
    const match = collegeApplicationsTable.match(
      /CHECK \(status IN \(([^)]+)\)\)/,
    );
    expect(match).not.toBeNull();

    const constraintStatuses = match![1]
      .split(",")
      .map((value) => value.trim().replace(/^'|'$/g, ""));

    expect([...COLLEGE_APPLICATION_STATUSES].sort()).toEqual(
      [...constraintStatuses].sort(),
    );
  });

  it("declares the real column set for the table", () => {
    const declaredColumns = collegeApplicationsTable
      .split("\n")
      .slice(1)
      .map((line) => line.trim().match(/^([a-z_]+)\s/)?.[1])
      .filter((name): name is string => Boolean(name) && name !== "CHECK");

    expect([...COLLEGE_APPLICATION_COLUMNS].sort()).toEqual(
      [...new Set(declaredColumns)].sort(),
    );
  });
});

describe("client queries against college_applications", () => {
  for (const file of CLIENT_SOURCES) {
    it(`${file} selects and filters only real columns`, () => {
      const chains = collegeApplicationQueries(readSource(file));

      for (const chain of chains) {
        for (const column of [...INVENTED_COLUMNS, ...FOREIGN_COLUMNS]) {
          expect(chain).not.toContain(column);
        }
      }
    });

    it(`${file} references no invented column name anywhere`, () => {
      const source = readSource(file);
      for (const column of INVENTED_COLUMNS) {
        expect(source).not.toContain(column);
      }
    });

    it(`${file} uses no retired status value`, () => {
      const source = readSource(file);
      for (const status of RETIRED_STATUSES) {
        expect(source).not.toContain(status);
      }
    });
  }
});
