export const PARTNER_COURSE_SELECT = [
  "id",
  "title",
  "description",
  "category",
  "thumbnail_url",
  "redirect_url",
  "partner_name",
  "partner_id",
  "display_order",
  "referral_code",
  "status",
  "is_published",
  "is_partnered",
  "created_at",
  "updated_at",
  "deleted_at",
].join(",");

export interface PartnerCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  redirect_url: string | null;
  partner_name: string | null;
  partner_id: string | null;
  display_order: number;
  referral_code: string | null;
  status: string;
  is_published: boolean;
  is_partnered: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const getPartnerCourseRedirect = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const candidate = value.trim();

  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "learn.merotalent.com" ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
};

export const isLivePartnerCourse = (course: PartnerCourse): boolean =>
  course.is_partnered === true &&
  course.is_published === true &&
  course.status === "published" &&
  course.deleted_at === null &&
  getPartnerCourseRedirect(course.redirect_url) !== null;
