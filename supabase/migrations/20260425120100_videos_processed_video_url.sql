-- Explicit URL for FFmpeg-merged output (library music). Null when no server-side processing ran.

alter table public.videos
  add column if not exists processed_video_url text;

comment on column public.videos.processed_video_url is
  'Public URL of the post-processed (e.g. music-merged) video. Null when video_url is the only asset (no merge).';
