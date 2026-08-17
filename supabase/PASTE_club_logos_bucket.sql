-- Paste in Supabase SQL Editor.
-- Public bucket for club logo + cover photos (HNK Fruskogorac Ilok and all clubs).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-logos',
  'club-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table if exists storage.objects enable row level security;

drop policy if exists "club_logos_public_read" on storage.objects;
create policy "club_logos_public_read"
on storage.objects
for select
using (bucket_id = 'club-logos');
