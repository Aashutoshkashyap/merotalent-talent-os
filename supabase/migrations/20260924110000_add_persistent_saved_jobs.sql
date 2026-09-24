-- Durable, user-scoped job favourites. These never grant access to job or
-- applicant data; RLS allows a user to manage only their own saved rows.
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, job_id)
);

create index if not exists saved_jobs_active_user_idx
  on public.saved_jobs (user_id, created_at desc)
  where deleted_at is null;

alter table public.saved_jobs enable row level security;

drop policy if exists "Users manage their own saved jobs" on public.saved_jobs;
create policy "Users manage their own saved jobs"
  on public.saved_jobs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_saved_jobs_updated_at on public.saved_jobs;
create trigger set_saved_jobs_updated_at
  before update on public.saved_jobs
  for each row execute function public.update_updated_at_column();
