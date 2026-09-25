#!/usr/bin/env node

// Kept as a clear, safe compatibility notice for historical documentation.
// Generating/re-writing a historical migration is unsafe and would bypass the
// current source-ownership and provenance controls.
console.error([
  "This legacy generator is retired.",
  "It previously wrote a historical migration containing hard-coded directory data and source URLs.",
  "Use scripts/ingest-edusanjal-bulk.mjs with a reviewed JSON input instead.",
  "The current importer is idempotent, keeps source provenance internal, and protects managed college content.",
].join("\n"));
process.exitCode = 1;
