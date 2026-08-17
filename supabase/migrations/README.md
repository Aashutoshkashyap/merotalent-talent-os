# Supabase migration history

The timestamped SQL files in this directory are an append-only schema history. Do not delete, rename, reorder, or edit a migration after it has been applied to a shared environment.

Before applying migrations to an existing project:

1. Link the Supabase CLI to the exact project.
2. Compare `supabase_migrations.schema_migrations` with this directory.
3. Run a schema diff and review it before repairing history.
4. Apply only pending migrations with `supabase db push`.
5. Verify the expected columns, policies, functions, and seed records in the target database.

Several older migrations contain historical schema creation and education-directory imports. They may be folded into a reviewed baseline for a brand-new deployment later, but they are not safe to remove from the current history without first confirming every deployed environment.

Test users and cross-module QA fixtures are provisioned by `scripts/seed-test-users.mjs`, not by client-side fallback arrays. Runtime screens must display database records or an honest empty/error state.
