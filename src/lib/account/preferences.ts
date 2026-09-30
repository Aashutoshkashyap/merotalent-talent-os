export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email: true,
  push: true,
  competitions: true,
  mentorship: true,
  jobs: false,
  marketing: false,
} as const;

export type NotificationPreferences = {
  [K in keyof typeof DEFAULT_NOTIFICATION_PREFERENCES]: boolean;
};

export type AccountTheme = "light" | "dark" | "system";
export type AccountLanguage = "en" | "ne";

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const candidate = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(([key, fallback]) => [
      key,
      typeof candidate[key] === "boolean" ? candidate[key] : fallback,
    ]),
  ) as NotificationPreferences;
}

export function normalizeAccountTheme(value: unknown): AccountTheme {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function normalizeAccountLanguage(value: unknown): AccountLanguage {
  return value === "ne" ? "ne" : "en";
}
