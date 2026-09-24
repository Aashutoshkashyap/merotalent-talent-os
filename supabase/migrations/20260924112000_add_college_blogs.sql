-- A small college-owned publishing surface. It intentionally reuses the
-- existing college capability + entitlement boundary rather than adding CMS
-- roles or a second ownership model.
create table if not exists public.college_blogs (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text,
  content text not null check (char_length(content) between 1 and 50000),
  featured_image_url text,
  seo_title text,
  seo_description text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (institute_id, slug)
);

create index if not exists college_blogs_public_idx
  on public.college_blogs (institute_id, published_at desc)
  where status = 'published' and deleted_at is null;

alter table public.college_blogs enable row level security;

create policy "Public reads published college blogs" on public.college_blogs
  for select using (status = 'published' and deleted_at is null);
create policy "Entitled college admins read owned blogs" on public.college_blogs
  for select to authenticated using (
    public.authorize_module_access(auth.uid(), 'college', 'college', institute_id, 'profile_editing')
  );
create policy "Entitled college admins create owned blogs" on public.college_blogs
  for insert to authenticated with check (
    author_user_id = auth.uid()
    and public.authorize_module_access(auth.uid(), 'college', 'college', institute_id, 'profile_editing')
  );
create policy "Entitled college admins update owned blogs" on public.college_blogs
  for update to authenticated using (
    public.authorize_module_access(auth.uid(), 'college', 'college', institute_id, 'profile_editing')
  ) with check (
    public.authorize_module_access(auth.uid(), 'college', 'college', institute_id, 'profile_editing')
  );
create policy "Entitled college admins delete owned blogs" on public.college_blogs
  for delete to authenticated using (
    public.authorize_module_access(auth.uid(), 'college', 'college', institute_id, 'profile_editing')
  );

create trigger set_college_blogs_updated_at before update on public.college_blogs
  for each row execute function public.update_updated_at_column();
