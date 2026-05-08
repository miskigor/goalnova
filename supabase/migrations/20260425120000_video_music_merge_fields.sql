-- Video + music merge: store trim/volume and optional original upload URL.

alter table public.videos
  add column if not exists source_video_url text;

alter table public.videos
  add column if not exists music_start_seconds double precision not null default 0;

alter table public.videos
  add column if not exists music_end_seconds double precision;

alter table public.videos
  add column if not exists music_volume double precision not null default 1;

comment on column public.videos.source_video_url is 'Original file URL when video_url points to FFmpeg-merged output with library music.';
comment on column public.videos.music_start_seconds is 'Start offset (seconds) into selected music track for merge.';
comment on column public.videos.music_end_seconds is 'End offset (seconds) into music track; null treated as min(track length, video length) from start.';
comment on column public.videos.music_volume is 'Linear gain applied to merged music (1 = 100%).';
