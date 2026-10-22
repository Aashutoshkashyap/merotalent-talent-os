/** Lightweight callback routing only. A marker is never an identity proof. */
export const sourceRecoveryMarker = "merotalent.source-recovery-started";

export function isSourceRecoveryCallback(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const started = Number(window.sessionStorage.getItem(sourceRecoveryMarker));
    return started > 0 && started <= Date.now() && Date.now() - started < 10 * 60_000;
  } catch { return false; }
}

/** Preserve approved source callback patterns; never mutate source OAuth config. */
export function supportsSourceRecoveryPopup(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return false;
    return (url.protocol === "https:" && !url.port && ["www.merotalent.com", "merotalent.com"].includes(url.hostname)) ||
      (url.protocol === "http:" && url.hostname === "localhost" && ["3000", "3001"].includes(url.port)) ||
      (url.protocol === "https:" && /^[a-z0-9-]+\.vercel\.app$/.test(url.hostname));
  } catch { return false; }
}
