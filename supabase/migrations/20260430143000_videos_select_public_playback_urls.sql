-- Public feed/explore should allow any playable video URL variant.
-- Previous policy required only `video_url`, which hides rows that use
-- `processed_video_url` or `source_video_url` as canonical playback URL.

drop policy if exists "videos_select_explore_public" on public.videos;
create policy "videos_select_explore_public"
  on public.videos
  for select
  to anon, authenticated
  using (
    (
      video_url is not null
      and length(trim(video_url)) > 0
    )
    or (
      processed_video_url is not null
      and length(trim(processed_video_url)) > 0
    )
    or (
      source_video_url is not null
      and length(trim(source_video_url)) > 0
    )
  );

grant select on table public.videos to anon;
