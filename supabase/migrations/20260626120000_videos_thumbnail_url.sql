-- Video still frames for SEO (VideoObject thumbnailUrl) and social / watch-page poster.
alter table public.videos
  add column if not exists thumbnail_url text,
  add column if not exists poster_url text;

comment on column public.videos.thumbnail_url is
  'Public JPEG/PNG still frame URL for crawlers and link previews.';
comment on column public.videos.poster_url is
  'Optional alternate poster URL; thumbnail_url is preferred when set.';
