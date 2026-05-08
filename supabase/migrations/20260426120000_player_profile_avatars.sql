-- Player / scout profile photos in public storage + URL on profile rows.

alter table public.player_profiles
  add column if not exists avatar_url text;

alter table public.scout_profiles
  add column if not exists avatar_url text;

comment on column public.player_profiles.avatar_url is
  'Public storage URL for profile photo (bucket player-avatars).';
comment on column public.scout_profiles.avatar_url is
  'Public storage URL for profile photo (bucket player-avatars).';

insert into storage.buckets (id, name, public)
values ('player-avatars', 'player-avatars', true)
on conflict (id) do update set public = excluded.public;

-- RLS on storage.objects: hosted Supabase SQL Editor often returns 42501 (not owner of storage.objects).
-- Add policies via Dashboard → Storage → Policies, or run supabase/manual/player-avatars-rls.sql where you have superuser (e.g. local Docker).
