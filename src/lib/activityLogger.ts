export interface LoggedActivity {
  id: string;
  kind: "job" | "college" | "event" | "mentor" | "competition";
  title: string;
  detail: string;
  status: "applied" | "bookmarked" | "viewed" | "booked";
  occurredAt: string;
  href: string;
}

const LOG_KEY = "merotalent.user_activity_log";
const BOOKMARKS_KEY = "merotalent.bookmarked_jobs";

export const getBookmarkedJobIds = (): string[] => {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const toggleBookmarkJobId = (jobId: string): boolean => {
  const current = getBookmarkedJobIds();
  const exists = current.includes(jobId);
  const updated = exists ? current.filter((id) => id !== jobId) : [...current, jobId];
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("merotalent-activity-updated"));
  return !exists;
};

export const logUserActivity = (activity: LoggedActivity) => {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const logs: LoggedActivity[] = raw ? JSON.parse(raw) : [];
    // Remove duplicate if same item and status logged recently
    const filtered = logs.filter((l) => !(l.id === activity.id && l.status === activity.status));
    const updated = [activity, ...filtered].slice(0, 50); // Keep last 50 activities
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("merotalent-activity-updated"));
  } catch (e) {
    console.error("Failed to log user activity", e);
  }
};

export const getLoggedActivities = (): LoggedActivity[] => {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
