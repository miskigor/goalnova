-- Scouts must not insert video rows or bucket objects (players unchanged).

drop policy if exists "videos_insert_own" on public.videos;
create policy "videos_insert_own"
  on public.videos
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'scout'
    )
  );

drop policy if exists "pitchrusch_videos_insert_own" on storage.objects;
create policy "pitchrusch_videos_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
    and not exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'scout'
    )
  );
