-- PitchRusch music library v2: richer metadata + videos.selected_music_track_id + staff CRUD.

-- --- music_tracks: extend schema
alter table public.music_tracks
  add column if not exists artist text;

alter table public.music_tracks
  add column if not exists duration_seconds integer not null default 0;

alter table public.music_tracks
  add column if not exists cover_image_url text;

alter table public.music_tracks
  add column if not exists license_type text;

alter table public.music_tracks
  add column if not exists provider text;

-- Migrate legacy "duration" column if present (from v1 migration).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'music_tracks' and column_name = 'duration'
  ) then
    execute 'update public.music_tracks set duration_seconds = coalesce(duration, duration_seconds, 0)';
    execute 'alter table public.music_tracks drop column duration';
  end if;
end $$;

update public.music_tracks
set artist = coalesce(nullif(trim(artist), ''), 'Various artists')
where artist is null or trim(artist) = '';

alter table public.music_tracks
  alter column artist set default 'Various artists';

alter table public.music_tracks
  alter column artist set not null;

update public.music_tracks
set license_type = coalesce(nullif(trim(license_type), ''), 'royalty_free')
where license_type is null or trim(license_type) = '';

alter table public.music_tracks
  alter column license_type set default 'royalty_free';

alter table public.music_tracks
  alter column license_type set not null;

update public.music_tracks
set provider = coalesce(nullif(trim(provider), ''), 'PitchRusch')
where provider is null or trim(provider) = '';

alter table public.music_tracks
  alter column provider set default 'PitchRusch';

alter table public.music_tracks
  alter column provider set not null;

alter table public.music_tracks drop column if exists pixabay_audio_id;
alter table public.music_tracks drop column if exists license_note;

drop index if exists music_tracks_active_idx;
create index if not exists music_tracks_active_idx
  on public.music_tracks (active)
  where active = true;

create index if not exists music_tracks_genre_idx on public.music_tracks (genre);
create index if not exists music_tracks_mood_idx on public.music_tracks (mood);

alter table public.music_tracks drop constraint if exists music_tracks_duration_non_negative;
alter table public.music_tracks
  add constraint music_tracks_duration_seconds_non_negative check (duration_seconds >= 0);

comment on table public.music_tracks is 'Royalty-free / commercially licensed catalog tracks for optional video background music (metadata MVP).';
comment on column public.music_tracks.license_type is 'e.g. royalty_free, custom — set by admins; users only see active tracks.';

-- --- videos: rename FK column to selected_music_track_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'music_track_id'
  ) then
    alter table public.videos rename column music_track_id to selected_music_track_id;
  end if;
end $$;

alter table public.videos
  add column if not exists selected_music_track_id uuid references public.music_tracks (id) on delete set null;

drop index if exists videos_music_track_id_idx;
create index if not exists videos_selected_music_track_id_idx
  on public.videos (selected_music_track_id);

-- --- trigger: validate active track
create or replace function public.videos_selected_music_track_must_be_active()
returns trigger
language plpgsql
as $$
begin
  if new.selected_music_track_id is not null then
    if not exists (
      select 1 from public.music_tracks m
      where m.id = new.selected_music_track_id and m.active = true
    ) then
      raise exception 'selected_music_track_id must reference an active music_tracks row';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists videos_music_track_active_check on public.videos;
drop trigger if exists videos_selected_music_track_active_check on public.videos;
create trigger videos_selected_music_track_active_check
  before insert or update of selected_music_track_id on public.videos
  for each row
  execute procedure public.videos_selected_music_track_must_be_active();

drop function if exists public.videos_music_track_must_be_active();

-- --- RLS: staff can manage full catalog (see inactive + write)
drop policy if exists "music_tracks_staff_select_all" on public.music_tracks;
create policy "music_tracks_staff_select_all"
  on public.music_tracks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.admin_role is not null or coalesce(u.is_admin, false) = true)
    )
  );

drop policy if exists "music_tracks_staff_insert" on public.music_tracks;
create policy "music_tracks_staff_insert"
  on public.music_tracks
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.admin_role is not null or coalesce(u.is_admin, false) = true)
    )
  );

drop policy if exists "music_tracks_staff_update" on public.music_tracks;
create policy "music_tracks_staff_update"
  on public.music_tracks
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.admin_role is not null or coalesce(u.is_admin, false) = true)
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.admin_role is not null or coalesce(u.is_admin, false) = true)
    )
  );

drop policy if exists "music_tracks_staff_delete" on public.music_tracks;
create policy "music_tracks_staff_delete"
  on public.music_tracks
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.admin_role is not null or coalesce(u.is_admin, false) = true)
    )
  );

grant insert, update, delete on table public.music_tracks to authenticated;
