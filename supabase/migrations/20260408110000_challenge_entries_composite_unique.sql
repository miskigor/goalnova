-- Align with client upsert onConflict: challenge_id,video_id (see challengeEntries.ts).
-- Composite unique: one row per (challenge, video). UNIQUE (video_id) is removed so the
-- client must delete any prior rows for that video_id before upsert when the video moves challenges.

alter table public.challenge_entries
  drop constraint if exists challenge_entries_video_id_unique;

alter table public.challenge_entries
  add constraint challenge_entries_challenge_id_video_id_unique
  unique (challenge_id, video_id);

drop policy if exists "challenge_entries_delete_own_video" on public.challenge_entries;
create policy "challenge_entries_delete_own_video"
  on public.challenge_entries
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  );

grant delete on table public.challenge_entries to authenticated;

comment on constraint challenge_entries_challenge_id_video_id_unique on public.challenge_entries is
  'Supabase upsert onConflict: challenge_id,video_id. App deletes prior rows for video_id before upsert when re-tagging.';

comment on table public.challenge_entries is
  'Challenge participation: unique (challenge_id, video_id). At most one entry row per video in practice (videos.challenge_id); client deletes by video_id before upsert when moving a video between challenges.';
