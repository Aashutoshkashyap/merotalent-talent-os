/** Old learning-site links still use the main domain. Only known public shapes move. */
export function legacyLearningDestination(segments: readonly string[] | undefined): string | null {
  if (!segments) return null;
  const store = segments[0] === "s" && segments[1] === "store"
    && (segments.length === 2 || (segments.length === 3 && segments[2] === "courses"));
  const contact = segments.length === 1 && segments[0] === "contactus";
  const course = segments.length === 2 && segments[0] === "courses"
    && /^[A-Za-z0-9_-]+-[a-fA-F0-9]{24}$/.test(segments[1]);
  if (!store && !contact && !course) return null;
  // Never forward query parameters, credentials or caller-controlled origins.
  return `https://learn.merotalent.com/${segments.map(encodeURIComponent).join("/")}`;
}
