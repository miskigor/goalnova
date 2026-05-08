-- Run ONLY where you have rights on storage.objects (e.g. local `supabase db` / psql as superuser).
-- On Supabase hosted, use Dashboard → Storage → Policies instead (SQL Editor often returns 42501).

drop policy if exists "player_avatars_select_public" on storage.objects;
drop policy if exists "player_avatars_insert_own" on storage.objects;
drop policy if exists "player_avatars_update_own" on storage.objects;
drop policy if exists "player_avatars_delete_own" on storage.objects;

create policy "player_avatars_select_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'player-avatars');

create policy "player_avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'player-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "player_avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'player-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'player-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "player_avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'player-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);
