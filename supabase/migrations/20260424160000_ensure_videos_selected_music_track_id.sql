-- Ensure public.videos.selected_music_track_id exists and matches app + types.
-- Idempotent: safe if 20260407194000 + 20260408105000 already applied.

-- Rename legacy column from first music migration (if present and new name missing).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'music_track_id'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'selected_music_track_id'
  ) then
    alter table public.videos rename column music_track_id to selected_music_track_id;
  end if;
end $$;

-- Add canonical column when neither legacy nor new column was ever created.
alter table public.videos
  add column if not exists selected_music_track_id uuid references public.music_tracks (id) on delete set null;

drop index if exists videos_music_track_id_idx;
create index if not exists videos_selected_music_track_id_idx
  on public.videos (selected_music_track_id);

-- Validate FK points at an active catalog row (same semantics as v2 migration).
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

comment on column public.videos.selected_music_track_id is 'Optional PitchRusch library track (metadata MVP); null = no music.';
