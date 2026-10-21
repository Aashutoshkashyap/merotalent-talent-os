/** Read-only tools may inspect this exact candidate, never an arbitrary URL. */
export function productionCandidateUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("PRODUCTION_CANDIDATE_URL_REQUIRED"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== "/neondb" ||
    !url.username || !url.password || (url.port && url.port !== "5432") || url.hash ||
    !["ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech",
      "ep-polished-flower-azsezy8a.c-3.ap-southeast-1.aws.neon.tech"].includes(url.hostname) ||
    [...url.searchParams.keys()].some(key => !["sslmode", "channel_binding"].includes(key))) {
    throw new Error("UNREVIEWED_PRODUCTION_CANDIDATE");
  }
  url.searchParams.set("sslmode", "verify-full");
  return url;
}
