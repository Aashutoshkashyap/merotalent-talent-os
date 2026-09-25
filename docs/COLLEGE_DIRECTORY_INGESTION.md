# College directory ingestion

MeroTalent owns the public college directory.  It reads only from the
`institutes` table through the `institute_directory` public view; it never
requests a third-party directory while rendering a listing, search result, or
college page.

## Safe workflow

1. Review a source site's terms, permissions, and robots policy.
2. Collect only permitted, factual educational data into a reviewed JSON file.
3. Reconcile against the existing directory without writing:

   ```bash
   npm run ingest:colleges -- --input ./approved-colleges.json --with-database
   ```

4. Refresh only confidently matched existing colleges:

   ```bash
   npm run ingest:colleges -- --input ./approved-colleges.json --mode refresh-existing --write
   ```

The remote single-record option is deliberately explicit:

```bash
npm run ingest:colleges -- --source-url https://edusanjal.com/college/example/ --confirm-permission
```

It checks `robots.txt`, waits at least one second before fetching the record,
and extracts only JSON-LD educational-organization facts. It does not copy
editorial prose, photographs, logos, or source-hosted media. Do not use it
until the relevant source terms and reuse permission have been reviewed.

## Reconciliation modes

- `dry-run` is the default. Add `--with-database` to report whether each
  source record would be matched, new, or needs review without writing.
- `refresh-existing` updates only confidently matched, source-managed facts.
- `new-only` can create only confidently unmatched records as `pending`.
- `full-reconcile` handles both paths but additionally requires
  `--confirm-reconciliation`.

Provenance, source slug, official website, and normalized identity are checked
in that order. Similar names are review-only. They create an internal
`institute_ingestion_reviews` item instead of modifying or duplicating a
college.

## Ownership and public visibility

Newly imported records are `pending` for Super Admin approval. The importer
matches by source record, slug, or normalized name/location and calls the
service-only `ingest_institute_source_record` database function. Re-running a
record with the same hash is idempotent.

Claimed colleges are fully protected from source refreshes. For unclaimed
records, any field subsequently edited through a MeroTalent admin/college flow
is recorded in `institute_content_ownership` and is not overwritten. Source
provenance is stored in the RLS-protected `institute_ingestion_provenance`
table; it is not part of the public directory view. The legitimate
institutional `website` remains public.
