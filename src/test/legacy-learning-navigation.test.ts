import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { legacyLearningDestination } from "@/lib/navigation/legacy-learning";

describe("historical public learning links", () => {
  it.each([
    "s/store", "s/store/courses", "contactus",
    "courses/Ask-an-Engineer-1-on-1-Mentorship-with-Er-Rajkumar-Adhikari-684bd099b742c85ad6e9939d",
    "courses/How-to-Use-Mr-Valuator--6a6b02489d8ae6f6cdfbb3fe",
  ])("routes %s to the existing partner, not an application 404", path => {
    expect(legacyLearningDestination(path.split("/"))).toBe(`https://learn.merotalent.com/${path}`);
  });
  it.each([
    [], ["courses"], ["courses", "65cd099d-bf0c-4c2f-844b-7763158f9ff9"],
    ["courses", "unknown-course"], ["s", "store", "checkout"], ["api", "payments"],
    ["auth", "callback"], ["dashboard"], ["contactus", ".."], ["s/store"],
    ["courses", "https://evil.example/thing-684bd099b742c85ad6e9939d"],
    ["courses", "course-684bd099b742c85ad6e9939d?token=private"],
  ].map(segments => ({ segments })))("does not redirect unrelated or unsafe route $segments", ({ segments }) => {
    expect(legacyLearningDestination(segments)).toBeNull();
  });
  it("redirects on the server before resolving records or rendering the application", () => {
    const page = readFileSync("app/[[...slug]]/page.tsx", "utf8").split("export default async function AppPage")[1];
    expect(page.indexOf("redirect(learningDestination)")).toBeLessThan(page.indexOf("getPublicRecord(slug)"));
    expect(page).not.toContain("searchParams");
  });
});
