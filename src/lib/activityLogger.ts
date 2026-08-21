export interface LoggedActivity {
  id: string;
  kind: "job" | "college" | "event" | "mentor" | "competition";
  title: string;
  detail: string;
  status: "applied" | "bookmarked" | "viewed" | "booked";
  occurredAt: string;
  href: string;
}

const getKey = (baseKey: string, userId?: string) =>
  userId ? `${baseKey}_${userId}` : baseKey;

export const getBookmarkedJobIds = (userId?: string): string[] => {
  try {
    const raw = localStorage.getItem(getKey("merotalent.bookmarked_jobs", userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const toggleBookmarkJobId = (jobId: string, userId?: string): boolean => {
  const current = getBookmarkedJobIds(userId);
  const exists = current.includes(jobId);
  const updated = exists ? current.filter((id) => id !== jobId) : [...current, jobId];
  localStorage.setItem(getKey("merotalent.bookmarked_jobs", userId), JSON.stringify(updated));
  window.dispatchEvent(new Event("merotalent-activity-updated"));
  return !exists;
};

export const logUserActivity = (activity: LoggedActivity, userId?: string) => {
  try {
    const key = getKey("merotalent.user_activity_log", userId);
    const raw = localStorage.getItem(key);
    const logs: LoggedActivity[] = raw ? JSON.parse(raw) : [];
    // Remove duplicate if same item and status logged recently
    const filtered = logs.filter((l) => !(l.id === activity.id && l.status === activity.status));
    const updated = [activity, ...filtered].slice(0, 50); // Keep last 50 activities
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event("merotalent-activity-updated"));
  } catch (e) {
    console.error("Failed to log user activity", e);
  }
};

export const getLoggedActivities = (userId?: string): LoggedActivity[] => {
  try {
    const raw = localStorage.getItem(getKey("merotalent.user_activity_log", userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
