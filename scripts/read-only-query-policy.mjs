/** Defense in depth for the hard-coded source inventory queries. */
export function assertInventorySelect(query) {
  if (typeof query !== "string" || !/^\s*SELECT\b/i.test(query) ||
      /;|--|\/\*|\*\//.test(query) || /\bFOR\s+UPDATE\b|\bINTO\b/i.test(query)) {
    throw new Error("Only a single read-only SELECT inventory query is allowed.");
  }
}
