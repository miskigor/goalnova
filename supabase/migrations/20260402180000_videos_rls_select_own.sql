-- Allow authenticated users to read their own rows in public.videos.
-- Without a SELECT policy (or with RLS enabled and no policy), PostgREST returns [] with no error.

alter table public.videos enable row level security;

drop policy if exists "videos_select_own" on public.videos;
create policy "videos_select_own"
  on public.videos
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts from the upload flow typically need a matching policy; add if missing.
drop policy if exists "videos_insert_own" on public.videos;
create policy "videos_insert_own"
  on public.videos
  for insert
  to authenticated
  with check (auth.uid() = user_id);
