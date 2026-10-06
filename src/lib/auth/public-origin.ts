const PRODUCTION_ORIGIN = "https://www.merotalent.com";

const normalizeOrigin = (value: string | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
};

export const getPublicOrigin = () => {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return window.location.origin;
  }
  return PRODUCTION_ORIGIN;
};

export const getAuthCallbackUrl = () => `${getPublicOrigin()}/auth/callback`;
export const getPasswordResetUrl = () => `${getPublicOrigin()}/reset-password`;
