-- Junction table for challenge participation + allow owners to set challenge_id on their videos.

create table if not exists public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint challenge_entries_video_id_unique unique (video_id)
);

-- Initial unique (video_id). Replaced by 20260408110000 with UNIQUE (challenge_id, video_id) +
-- onConflict challenge_id,video_id in challengeEntries.ts (delete by video_id before upsert).

create index if not exists challenge_entries_challenge_id_idx
  on public.challenge_entries (challenge_id);

comment on table public.challenge_entries is
  'Challenge participation; see later migrations + challengeEntries.ts for upsert/unique targets.';

alter table public.challenge_entries enable row level security;

drop policy if exists "challenge_entries_select_public" on public.challenge_entries;
create policy "challenge_entries_select_public"
  on public.challenge_entries
  for select
  to anon, authenticated
  using (true);

drop policy if exists "challenge_entries_insert_own_video" on public.challenge_entries;
create policy "challenge_entries_insert_own_video"
  on public.challenge_entries
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  );

drop policy if exists "challenge_entries_update_own_video" on public.challenge_entries;
create policy "challenge_entries_update_own_video"
  on public.challenge_entries
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  );

grant select, insert, update on table public.challenge_entries to authenticated;
grant select on table public.challenge_entries to anon;

-- Required for "Submit to Challenge" on existing uploads (set videos.challenge_id).
drop policy if exists "videos_update_own" on public.videos;
create policy "videos_update_own"
  on public.videos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
