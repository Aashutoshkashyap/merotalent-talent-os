const guestApplicationTokenKey = "merotalent.guest-college-application-token.v1";

/**
 * This token is a device-local claim key, not a credential. The database stores
 * only its hash and requires the authenticated account email to match before a
 * past guest application can be claimed.
 */
export const getGuestCollegeApplicationToken = (): string => {
  try {
    const existing = window.localStorage.getItem(guestApplicationTokenKey);
    if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(guestApplicationTokenKey, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
};

export const getStoredGuestCollegeApplicationToken = (): string | null => {
  try {
    const value = window.localStorage.getItem(guestApplicationTokenKey);
    return value && /^[a-f0-9-]{36}$/i.test(value) ? value : null;
  } catch {
    return null;
  }
};
