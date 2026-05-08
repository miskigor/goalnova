-- App derives hashtag-style labels from title; tag column is no longer used.
alter table public.challenges drop column if exists tag;
