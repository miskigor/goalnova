-- Profile avatars: canonical URL on public.users + Storage bucket `profile-avatars`.
-- App also syncs avatar_url to player_profiles / scout_profiles for existing public reads.

alter table public.users
  add column if not exists avatar_url text;

comment on column public.users.avatar_url is
  'Public URL of profile photo (Supabase Storage bucket profile-avatars).';

alter table if exists storage.objects enable row level security;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "profile_avatars_public_read" on storage.objects;
drop policy if exists "profile_avatars_insert_own" on storage.objects;
drop policy if exists "profile_avatars_update_own" on storage.objects;
drop policy if exists "profile_avatars_delete_own" on storage.objects;

-- Public bucket: anyone can read objects (for <img src=…>).
create policy "profile_avatars_public_read"
on storage.objects
for select
using (bucket_id = 'profile-avatars');

-- Authenticated users may only write under `{auth.uid()}/…`.
create policy "profile_avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "profile_avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "profile_avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);
