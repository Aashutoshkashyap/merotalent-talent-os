import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeAccountLanguage,
  normalizeAccountTheme,
  normalizeNotificationPreferences,
} from "./preferences";

describe("account preferences", () => {
  it("preserves only supported saved notification values", () => {
    expect(normalizeNotificationPreferences({ email: false, jobs: true, unknown: true })).toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      email: false,
      jobs: true,
    });
  });

  it("falls back safely for malformed preferences", () => {
    expect(normalizeNotificationPreferences("invalid")).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(normalizeAccountTheme("untrusted")).toBe("system");
    expect(normalizeAccountLanguage("untrusted")).toBe("en");
  });
});
