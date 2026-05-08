-- Rename Storage buckets goalnova-* → pitchrusch-* (objects + public URLs).
-- Safe to re-run: updates are conditional; buckets dropped only after object moves.

-- ---------------------------------------------------------------------------
-- Music catalog bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pitchrusch-music', 'pitchrusch-music', true)
on conflict (id) do update set public = excluded.public;

update storage.objects
set bucket_id = 'pitchrusch-music'
where bucket_id = 'goalnova-music';

drop policy if exists "goalnova_music_public_read" on storage.objects;
drop policy if exists "pitchrusch_music_public_read" on storage.objects;

create policy "pitchrusch_music_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'pitchrusch-music');

delete from storage.buckets where id = 'goalnova-music';

update public.music_tracks
set audio_url = replace(audio_url, 'goalnova-music', 'pitchrusch-music')
where audio_url is not null
  and audio_url like '%goalnova-music%';

-- ---------------------------------------------------------------------------
-- User videos bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pitchrusch-videos', 'pitchrusch-videos', true)
on conflict (id) do update set public = excluded.public;

update storage.objects
set bucket_id = 'pitchrusch-videos'
where bucket_id = 'goalnova-videos';

-- RLS for new bucket (public read + owner-only writes under `{uid}/…`).
alter table if exists storage.objects enable row level security;

drop policy if exists "pitchrusch_videos_public_read" on storage.objects;
create policy "pitchrusch_videos_public_read"
  on storage.objects
  for select
  using (bucket_id = 'pitchrusch-videos');

drop policy if exists "pitchrusch_videos_insert_own" on storage.objects;
create policy "pitchrusch_videos_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "pitchrusch_videos_update_own" on storage.objects;
create policy "pitchrusch_videos_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "pitchrusch_videos_delete_own" on storage.objects;
create policy "pitchrusch_videos_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

delete from storage.buckets where id = 'goalnova-videos';

update public.videos
set video_url = replace(video_url, 'goalnova-videos', 'pitchrusch-videos')
where video_url is not null
  and video_url like '%goalnova-videos%';

update public.videos
set processed_video_url = replace(processed_video_url, 'goalnova-videos', 'pitchrusch-videos')
where processed_video_url is not null
  and processed_video_url like '%goalnova-videos%';

update public.videos
set source_video_url = replace(source_video_url, 'goalnova-videos', 'pitchrusch-videos')
where source_video_url is not null
  and source_video_url like '%goalnova-videos%';
