import { describe, expect, it } from "vitest";

import { getPartnerCourseRedirect, isLivePartnerCourse, type PartnerCourse } from "./partnered-courses";

const liveCourse: PartnerCourse = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Career Foundations",
  description: null,
  category: "Career",
  thumbnail_url: null,
  redirect_url: "https://learn.merotalent.com/courses/career-foundations",
  partner_name: "MeroTalent Learning",
  partner_id: null,
  display_order: 0,
  referral_code: null,
  status: "published",
  is_published: true,
  is_partnered: true,
  created_at: "2026-08-17T00:00:00.000Z",
  updated_at: "2026-08-17T00:00:00.000Z",
  deleted_at: null,
};

describe("partner course redirects", () => {
  it("accepts only HTTPS destinations on the exact learning host", () => {
    expect(getPartnerCourseRedirect(liveCourse.redirect_url)).toBe(liveCourse.redirect_url);
    expect(getPartnerCourseRedirect("http://learn.merotalent.com/course/one")).toBeNull();
    expect(getPartnerCourseRedirect("https://courses.learn.merotalent.com/course/one")).toBeNull();
    expect(getPartnerCourseRedirect("https://learn.merotalent.com.evil.example/course/one")).toBeNull();
    expect(getPartnerCourseRedirect("https://user:password@learn.merotalent.com/course/one")).toBeNull();
  });

  it("requires the complete published partner listing state", () => {
    expect(isLivePartnerCourse(liveCourse)).toBe(true);
    expect(isLivePartnerCourse({ ...liveCourse, is_published: false })).toBe(false);
    expect(isLivePartnerCourse({ ...liveCourse, status: "draft" })).toBe(false);
    expect(isLivePartnerCourse({ ...liveCourse, deleted_at: "2026-08-17T01:00:00.000Z" })).toBe(false);
    expect(isLivePartnerCourse({ ...liveCourse, redirect_url: "https://example.com" })).toBe(false);
  });
});
