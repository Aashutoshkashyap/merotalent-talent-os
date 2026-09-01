const cacheKeyPrefix = "merotalent.student_activity_cache";

export const getStudentActivityCacheKey = (userId: string) => `${cacheKeyPrefix}_${userId}`;

export const invalidateStudentActivityCache = (userId: string) => {
  try {
    localStorage.removeItem(getStudentActivityCacheKey(userId));
    window.dispatchEvent(new CustomEvent("merotalent:student-activity-updated", { detail: { userId } }));
  } catch {}
};
