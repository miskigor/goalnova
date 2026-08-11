-- Optional: create private storage bucket for club partnership proof uploads.
-- Prefer Dashboard → Storage → New bucket if this insert is restricted.
--
-- name: club-verification-documents
-- Public: OFF
-- File size limit: 10MB
-- Allowed MIME: application/pdf, image/jpeg, image/png

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-verification-documents',
  'club-verification-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
