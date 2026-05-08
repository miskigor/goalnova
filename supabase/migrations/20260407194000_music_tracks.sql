-- PitchRusch royalty-free music catalog (e.g. Pixabay) + optional link on uploaded videos.
-- Tracks are ingested via scripts/pixabay-music-sync.mjs (service role) — not from the client.

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  genre text,
  mood text,
  audio_url text not null,
  duration integer not null default 0,
  active boolean not null default true,
  pixabay_audio_id bigint unique,
  license_note text not null default 'Pixabay License — free for commercial use; see https://pixabay.com/service/license/',
  created_at timestamptz not null default now(),
  constraint music_tracks_duration_non_negative check (duration >= 0)
);

create index if not exists music_tracks_active_idx on public.music_tracks (active) where active = true;

alter table public.music_tracks enable row level security;

drop policy if exists "music_tracks_select_active_public" on public.music_tracks;
create policy "music_tracks_select_active_public"
  on public.music_tracks
  for select
  to anon, authenticated
  using (active = true);

grant select on table public.music_tracks to anon, authenticated;

-- Optional background music on user uploads
alter table public.videos
  add column if not exists music_track_id uuid references public.music_tracks (id) on delete set null;

create index if not exists videos_music_track_id_idx on public.videos (music_track_id);

create or replace function public.videos_music_track_must_be_active()
returns trigger
language plpgsql
as $$
begin
  if new.music_track_id is not null then
    if not exists (
      select 1 from public.music_tracks m
      where m.id = new.music_track_id and m.active = true
    ) then
      raise exception 'music_track_id must reference an active music_tracks row';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists videos_music_track_active_check on public.videos;
create trigger videos_music_track_active_check
  before insert or update of music_track_id on public.videos
  for each row
  execute procedure public.videos_music_track_must_be_active();

-- Public CDN bucket for catalog MP3s (filled by sync script, not user uploads).
insert into storage.buckets (id, name, public)
values ('goalnova-music', 'goalnova-music', true)
on conflict (id) do nothing;

drop policy if exists "goalnova_music_public_read" on storage.objects;
create policy "goalnova_music_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'goalnova-music');
