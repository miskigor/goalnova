-- =============================================================================
-- PitchRusch — spojene migracije (samo SQL, bez terminala)
--
-- KAKO U SUPABASE (SQL Editor)
-- 1) Otvori lokalno ovaj fajl: supabase/ALL_MIGRATIONS_COPY_PASTE_SUPABASE.sql
-- 2) Select all u EDITORU TOG FAJLA → Copy
-- 3) Supabase → SQL → New query → Paste → Run
--
-- NIKAKO ne lijepaj naredbe tipa: cd "... " && cat ... (to nije SQL.)
--
-- Ako baza već ima dio sheme, "already exists" je čest — čitaj poruku ili
-- pokreni samo pojedinačne fajlove iz supabase/migrations/ koje još nemaš.
-- =============================================================================



-- ============================================================================
-- FILE: 20260402140000_create_messages.sql
-- ============================================================================
-- Direct messages between authenticated users.
-- Apply in Supabase SQL editor or via CLI: supabase db push
--
-- After changing this table, regenerate TypeScript:
--   npx supabase gen types typescript --project-id "<ref>" --schema public > lib/supabase/database.types.ts
-- (see header in lib/supabase/database.types.ts)

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid not null references public.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint messages_message_not_blank check (length(trim(message)) > 0),
  constraint messages_no_self_send check (sender_id <> receiver_id)
);

create index if not exists messages_sender_created_at_idx
  on public.messages (sender_id, created_at desc);

create index if not exists messages_receiver_created_at_idx
  on public.messages (receiver_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages_select_participants" on public.messages;
drop policy if exists "messages_insert_as_sender" on public.messages;

create policy "messages_select_participants"
  on public.messages
  for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "messages_insert_as_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
  );

grant select, insert on table public.messages to authenticated;


-- ============================================================================
-- FILE: 20260402150000_messages_realtime.sql
-- ============================================================================
-- Enable Realtime broadcasts for new messages (required for postgres_changes subscriptions).
-- Safe to run once; ignore error if the table is already in the publication.

alter publication supabase_realtime add table public.messages;


-- ============================================================================
-- FILE: 20260402160000_messages_rename_body_to_message.sql
-- ============================================================================
-- If an older migration created `messages.body`, rename it to `message` to match the app.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'body'
  ) then
    alter table public.messages rename column body to message;
  end if;
end $$;


-- ============================================================================
-- FILE: 20260402170000_premium_and_ai_analyses.sql
-- ============================================================================
-- Premium flag on users (AI analysis and other premium features).
alter table public.users
  add column if not exists is_premium boolean not null default false;

-- AI video analysis results (one row per analyst user + video; upsert on re-run).
create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  speed double precision not null,
  technique double precision not null,
  decision_making double precision not null,
  agility double precision not null,
  shot_power double precision not null,
  overall_score double precision not null,
  feedback_text text not null,
  created_at timestamptz not null default now(),
  constraint ai_analyses_scores_range check (
    speed between 0 and 100
    and technique between 0 and 100
    and decision_making between 0 and 100
    and agility between 0 and 100
    and shot_power between 0 and 100
    and overall_score between 0 and 100
  ),
  constraint ai_analyses_user_video_unique unique (user_id, video_id)
);

create index if not exists ai_analyses_video_id_idx on public.ai_analyses (video_id);
create index if not exists ai_analyses_user_id_idx on public.ai_analyses (user_id);

alter table public.ai_analyses enable row level security;

create policy "ai_analyses_select_own"
  on public.ai_analyses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "ai_analyses_insert_premium_self"
  on public.ai_analyses
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and coalesce(u.is_premium, false) = true
    )
  );

create policy "ai_analyses_update_premium_self"
  on public.ai_analyses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and coalesce(u.is_premium, false) = true
    )
  );

grant select, insert, update on table public.ai_analyses to authenticated;


-- ============================================================================
-- FILE: 20260402180000_videos_rls_select_own.sql
-- ============================================================================
-- Allow authenticated users to read their own rows in public.videos.
-- Without a SELECT policy (or with RLS enabled and no policy), PostgREST returns [] with no error.

alter table public.videos enable row level security;

drop policy if exists "videos_select_own" on public.videos;
create policy "videos_select_own"
  on public.videos
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts from the upload flow typically need a matching policy; add if missing.
drop policy if exists "videos_insert_own" on public.videos;
create policy "videos_insert_own"
  on public.videos
  for insert
  to authenticated
  with check (auth.uid() = user_id);


-- ============================================================================
-- FILE: 20260402210000_ai_analyses_unique_video_id.sql
-- ============================================================================
-- One saved analysis per video: re-analyze updates the same row (upsert onConflict=video_id).
-- If `add constraint` fails, dedupe: keep one row per video_id (e.g. latest created_at) then re-run.
alter table public.ai_analyses
  drop constraint if exists ai_analyses_user_video_unique;

alter table public.ai_analyses
  add constraint ai_analyses_video_id_key unique (video_id);


-- ============================================================================
-- FILE: 20260402220000_notifications.sql
-- ============================================================================
-- In-app notifications (recipient = notifications.user_id; actor = related_user_id).
-- Apply via Supabase CLI or SQL editor. Regenerate TS types when convenient.

-- Resolve video owner for social notifications under strict videos RLS (select own only).
create or replace function public.video_owner_id(p_video_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select v.user_id
  from public.videos v
  where v.id = p_video_id
  limit 1;
$$;

revoke all on function public.video_owner_id(uuid) from public;
grant execute on function public.video_owner_id(uuid) to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null
    constraint notifications_type_check check (type in (
      'follow', 'like', 'comment', 'message', 'ai_analysis'
    )),
  message text not null,
  related_user_id uuid not null references public.users (id) on delete cascade,
  related_video_id uuid references public.videos (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_desc_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where is_read = false;

alter table public.notifications enable row level security;

-- Recipients read their inbox.
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Actors insert rows where they are the related user (MVP; tighten later with triggers if needed).
create policy "notifications_insert_as_related_user"
  on public.notifications
  for insert
  to authenticated
  with check (related_user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.notifications to authenticated;


-- ============================================================================
-- FILE: 20260402240000_goalnova_set_self_premium_rpc.sql
-- ============================================================================
-- Mock billing: lets authenticated users set their own `is_premium` when direct UPDATE is blocked by RLS.
-- Called from the app after `UPDATE public.users` fails; safe with SECURITY DEFINER because only `auth.uid()` is updated.

create or replace function public.goalnova_set_self_premium(p_is_premium boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.users
  set is_premium = p_is_premium
  where id = auth.uid();
end;
$$;

revoke all on function public.goalnova_set_self_premium(boolean) from public;
grant execute on function public.goalnova_set_self_premium(boolean) to authenticated;


-- ============================================================================
-- FILE: 20260402250000_videos_select_public_explore.sql
-- ============================================================================
-- Public read of videos for /explore and anonymous global feeds.
-- Existing "videos_select_own" still applies to authenticated users (OR semantics).
-- Anon can only satisfy this policy, so guests see all rows matching the predicate.

drop policy if exists "videos_select_explore_public" on public.videos;
create policy "videos_select_explore_public"
  on public.videos
  for select
  to anon, authenticated
  using (
    video_url is not null
    and length(trim(video_url)) > 0
  );

grant select on table public.videos to anon;

-- Like counts on explore (anon-friendly; no PII in likes row).
grant select on table public.likes to anon;

-- Player display names on cards (adjust if you enable RLS on player_profiles without a public SELECT policy).
grant select on table public.player_profiles to anon;


-- ============================================================================
-- FILE: 20260404120000_notifications_realtime.sql
-- ============================================================================
-- Enable Supabase Realtime for in-app notifications (RLS still applies per subscriber).
-- REPLICA IDENTITY FULL so UPDATE payloads include prior row values (e.g. is_read transitions).

alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;


-- ============================================================================
-- FILE: 20260405100000_challenges.sql
-- ============================================================================
-- Public challenges + optional association on videos.

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.challenges is 'Video challenges / hashtag campaigns (hashtag-style label derived from title in app).';

alter table public.videos
  add column if not exists challenge_id uuid references public.challenges (id) on delete set null;

create index if not exists videos_challenge_id_idx on public.videos (challenge_id)
  where challenge_id is not null;

alter table public.challenges enable row level security;

drop policy if exists "challenges_select_public" on public.challenges;
create policy "challenges_select_public"
  on public.challenges
  for select
  to anon, authenticated
  using (true);

grant select on table public.challenges to anon;
grant select on table public.challenges to authenticated;

insert into public.challenges (slug, title, description) values
  ('top-corner-challenge', 'Top Corner Challenge', 'Show your best strikes into the top corner.'),
  ('skills-showcase', 'Skills Showcase', 'Freestyle and technical skills.'),
  ('speed-dribble', 'Speed Dribble', 'Pace, close control, and acceleration.')
on conflict (slug) do nothing;


-- ============================================================================
-- FILE: 20260405120000_ai_analyses_public_challenge_videos.sql
-- ============================================================================
-- Public read of AI analysis rows for videos that belong to a challenge and have a public clip URL.
-- Enables challenge hub "best AI score" highlights without exposing analyses for non-challenge uploads.
-- Note: full row (including feedback_text) is readable for these rows; narrow later with a view if needed.

drop policy if exists "ai_analyses_select_public_challenge_videos" on public.ai_analyses;
create policy "ai_analyses_select_public_challenge_videos"
  on public.ai_analyses
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.videos v
      where v.id = ai_analyses.video_id
        and v.challenge_id is not null
        and v.video_url is not null
        and length(trim(v.video_url)) > 0
    )
  );

grant select on table public.ai_analyses to anon;


-- ============================================================================
-- FILE: 20260407140000_challenges_admin_fields_rls.sql
-- ============================================================================
-- Admin-managed challenge fields + staff-only write + public read excludes drafts.

alter table public.challenges
  add column if not exists rules text,
  add column if not exists reward text,
  add column if not exists expires_at timestamptz,
  add column if not exists status text not null default 'active'
    check (status in ('draft', 'active', 'ended'));

comment on column public.challenges.rules is 'Optional rules / how to participate.';
comment on column public.challenges.reward is 'Optional reward description for marketing.';
comment on column public.challenges.expires_at is 'When the challenge stops accepting emphasis in UI (nullable).';
comment on column public.challenges.status is 'draft = staff only; active/ended visible to players (ended = closed).';

drop policy if exists "challenges_select_public" on public.challenges;
create policy "challenges_select_public"
  on public.challenges
  for select
  to anon, authenticated
  using (status in ('active', 'ended'));

drop policy if exists "challenges_select_staff_all" on public.challenges;
create policy "challenges_select_staff_all"
  on public.challenges
  for select
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

drop policy if exists "challenges_insert_staff" on public.challenges;
create policy "challenges_insert_staff"
  on public.challenges
  for insert
  to authenticated
  with check (public.goalnova_staff_effective_role() is not null);

drop policy if exists "challenges_update_staff" on public.challenges;
create policy "challenges_update_staff"
  on public.challenges
  for update
  to authenticated
  using (public.goalnova_staff_effective_role() is not null)
  with check (public.goalnova_staff_effective_role() is not null);

grant insert, update on table public.challenges to authenticated;


-- ============================================================================
-- FILE: 20260407170000_challenge_entries_videos_update.sql
-- ============================================================================
-- Junction table for challenge participation + allow owners to set challenge_id on their videos.

create table if not exists public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint challenge_entries_video_id_unique unique (video_id)
);

-- Initial unique (video_id). Replaced by 20260408110000 with UNIQUE (challenge_id, video_id) +
-- onConflict challenge_id,video_id in challengeEntries.ts (delete by video_id before upsert).

create index if not exists challenge_entries_challenge_id_idx
  on public.challenge_entries (challenge_id);

comment on table public.challenge_entries is
  'Challenge participation; see later migrations + challengeEntries.ts for upsert/unique targets.';

alter table public.challenge_entries enable row level security;

drop policy if exists "challenge_entries_select_public" on public.challenge_entries;
create policy "challenge_entries_select_public"
  on public.challenge_entries
  for select
  to anon, authenticated
  using (true);

drop policy if exists "challenge_entries_insert_own_video" on public.challenge_entries;
create policy "challenge_entries_insert_own_video"
  on public.challenge_entries
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  );

drop policy if exists "challenge_entries_update_own_video" on public.challenge_entries;
create policy "challenge_entries_update_own_video"
  on public.challenge_entries
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  );

grant select, insert, update on table public.challenge_entries to authenticated;
grant select on table public.challenge_entries to anon;

-- Required for "Submit to Challenge" on existing uploads (set videos.challenge_id).
drop policy if exists "videos_update_own" on public.videos;
create policy "videos_update_own"
  on public.videos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================================
-- FILE: 20260407180000_ai_analyses_challenge_submission_rls.sql
-- ============================================================================
-- Allow challenge submitters (video owner + challenge-linked clip) to persist AI analysis
-- without premium. Premium policies remain for other videos.

create policy "ai_analyses_insert_challenge_submission"
  on public.ai_analyses
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = ai_analyses.video_id
        and v.user_id = auth.uid()
        and v.challenge_id is not null
    )
  );

create policy "ai_analyses_update_challenge_submission"
  on public.ai_analyses
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = ai_analyses.video_id
        and v.user_id = auth.uid()
        and v.challenge_id is not null
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = ai_analyses.video_id
        and v.user_id = auth.uid()
        and v.challenge_id is not null
    )
  );


-- ============================================================================
-- FILE: 20260407194000_music_tracks.sql
-- ============================================================================
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


-- ============================================================================
-- FILE: 20260408100000_challenge_entries_upsert_invariant.sql
-- ============================================================================
-- Document challenge_entries upsert ↔ constraint alignment for existing databases.
-- Constraint: challenge_entries_video_id_unique (UNIQUE video_id)
-- Client: lib/supabase/challengeEntries.ts → CHALLENGE_ENTRIES_UPSERT_ON_CONFLICT = video_id

comment on constraint challenge_entries_video_id_unique on public.challenge_entries is
  'Supabase/PostgREST upsert onConflict must be video_id (see challengeEntries.ts).';

comment on table public.challenge_entries is
  'Challenge participation: one row per video (unique video_id), aligned with a single videos.challenge_id per video. Client upsert uses onConflict video_id.';


-- ============================================================================
-- FILE: 20260408105000_music_library_v2.sql
-- ============================================================================
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


-- ============================================================================
-- FILE: 20260408110000_challenge_entries_composite_unique.sql
-- ============================================================================
-- Align with client upsert onConflict: challenge_id,video_id (see challengeEntries.ts).
-- Composite unique: one row per (challenge, video). UNIQUE (video_id) is removed so the
-- client must delete any prior rows for that video_id before upsert when the video moves challenges.

alter table public.challenge_entries
  drop constraint if exists challenge_entries_video_id_unique;

alter table public.challenge_entries
  add constraint challenge_entries_challenge_id_video_id_unique
  unique (challenge_id, video_id);

drop policy if exists "challenge_entries_delete_own_video" on public.challenge_entries;
create policy "challenge_entries_delete_own_video"
  on public.challenge_entries
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  );

grant delete on table public.challenge_entries to authenticated;

comment on constraint challenge_entries_challenge_id_video_id_unique on public.challenge_entries is
  'Supabase upsert onConflict: challenge_id,video_id. App deletes prior rows for video_id before upsert when re-tagging.';

comment on table public.challenge_entries is
  'Challenge participation: unique (challenge_id, video_id). At most one entry row per video in practice (videos.challenge_id); client deletes by video_id before upsert when moving a video between challenges.';


-- ============================================================================
-- FILE: 20260415200000_challenges_drop_tag_column.sql
-- ============================================================================
-- App derives hashtag-style labels from title; tag column is no longer used.
alter table public.challenges drop column if exists tag;


-- ============================================================================
-- FILE: 20260416200000_scout_verification.sql
-- ============================================================================
-- Scout verification: status + application fields on users, submit RPC.
-- After apply: regenerate lib/supabase/database.types.ts from your project.

alter table public.users
  add column if not exists scout_verification_status text not null default 'none'
    constraint users_scout_verification_status_check
      check (scout_verification_status in ('none', 'pending', 'approved', 'rejected'));

alter table public.users
  add column if not exists scout_apply_full_name text,
  add column if not exists scout_apply_organization text,
  add column if not exists scout_apply_business_email text,
  add column if not exists scout_apply_country text,
  add column if not exists scout_apply_description text,
  add column if not exists scout_apply_web_url text,
  add column if not exists scout_apply_submitted_at timestamptz;

comment on column public.users.scout_verification_status is 'Scout access gate: none | pending | approved | rejected';

-- Existing scouts keep full access (no forced re-application for current users).
update public.users
set scout_verification_status = 'approved'
where role = 'scout'
  and scout_verification_status = 'none';

create or replace function public.submit_scout_verification_application(
  p_full_name text,
  p_organization text,
  p_business_email text,
  p_country text,
  p_description text,
  p_web_url text default null
)
returns table (success boolean, error_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is null then
    return query select false::boolean, 'not_authenticated'::text;
    return;
  end if;

  update public.users u
  set
    scout_apply_full_name = nullif(trim(p_full_name), ''),
    scout_apply_organization = nullif(trim(p_organization), ''),
    scout_apply_business_email = nullif(trim(p_business_email), ''),
    scout_apply_country = nullif(trim(p_country), ''),
    scout_apply_description = nullif(trim(p_description), ''),
    scout_apply_web_url = nullif(trim(p_web_url), ''),
    scout_apply_submitted_at = now(),
    scout_verification_status = 'pending'
  where u.id = auth.uid()
    and u.role = 'scout'
    and u.scout_verification_status in ('none', 'rejected');

  get diagnostics n = row_count;

  if n = 0 then
    return query select false::boolean, 'not_eligible'::text;
  else
    return query select true::boolean, null::text;
  end if;
end;
$$;

revoke all on function public.submit_scout_verification_application(text, text, text, text, text, text) from public;
grant execute on function public.submit_scout_verification_application(text, text, text, text, text, text) to authenticated;


-- ============================================================================
-- FILE: 20260417140000_notifications_delete_messages_soft_hide.sql
-- ============================================================================
-- User-owned notification deletes + per-user message hide flags (soft delete for DM UX).

-- ---------------------------------------------------------------------------
-- Notifications: allow recipients to delete their own rows
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant delete on table public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Messages: soft hide per participant
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists deleted_for_sender boolean not null default false,
  add column if not exists deleted_for_recipient boolean not null default false;

comment on column public.messages.deleted_for_sender is
  'When true, the sender no longer sees this row in their UI.';
comment on column public.messages.deleted_for_recipient is
  'When true, the recipient no longer sees this row in their UI.';

create or replace function public.goalnova_hide_message_for_me(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.messages m
  set
    deleted_for_sender = case
      when m.sender_id = auth.uid() then true
      else m.deleted_for_sender
    end,
    deleted_for_recipient = case
      when m.receiver_id = auth.uid() then true
      else m.deleted_for_recipient
    end
  where m.id = p_message_id
    and (m.sender_id = auth.uid() or m.receiver_id = auth.uid());

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.goalnova_hide_message_for_me(uuid) from public;
grant execute on function public.goalnova_hide_message_for_me(uuid) to authenticated;


-- ============================================================================
-- FILE: 20260417160000_ai_visibility_analysis.sql
-- ============================================================================
-- Visibility-first AI analysis: optional legacy columns + structured JSON payload.

alter table public.ai_analyses
  add column if not exists visibility_analysis jsonb;

alter table public.ai_analyses
  drop constraint if exists ai_analyses_scores_range;

alter table public.ai_analyses
  alter column speed drop not null,
  alter column technique drop not null,
  alter column decision_making drop not null,
  alter column agility drop not null,
  alter column shot_power drop not null;

alter table public.ai_analyses
  add constraint ai_analyses_scores_range_v2 check (
    (speed is null or (speed >= 0 and speed <= 100))
    and (technique is null or (technique >= 0 and technique <= 100))
    and (decision_making is null or (decision_making >= 0 and decision_making <= 100))
    and (agility is null or (agility >= 0 and agility <= 100))
    and (shot_power is null or (shot_power >= 0 and shot_power <= 100))
    and overall_score between 0 and 100
  );

comment on column public.ai_analyses.visibility_analysis is
  'Evidence-based AI breakdown: clip understanding, per-metric assessability, scores only when visible.';


-- ============================================================================
-- FILE: 20260418100000_notifications_system_onboarding.sql
-- ============================================================================
-- System / onboarding notification types + idempotency + secure self-insert.

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'follow',
    'like',
    'comment',
    'message',
    'ai_analysis',
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification'
  ));

-- At most one row per user per onboarding/system type (prevents duplicate welcome etc. on retries).
create unique index if not exists notifications_user_onboarding_type_unique
  on public.notifications (user_id, type)
  where type in (
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification'
  );

-- Self-directed system notifications: recipient and actor are the same user.
drop policy if exists "notifications_insert_own_system" on public.notifications;

create policy "notifications_insert_own_system"
  on public.notifications
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and auth.uid() = related_user_id
    and type in (
      'welcome',
      'onboarding',
      'profile',
      'upload',
      'scout_verification'
    )
  );


-- ============================================================================
-- FILE: 20260418110000_notifications_dedupe_system_types.sql
-- ============================================================================
-- Remove duplicate system/onboarding rows (keep earliest created_at per user_id + type).
delete from public.notifications n
where n.id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by user_id, type
        order by created_at asc
      ) as rn
    from public.notifications
    where type in (
      'welcome',
      'onboarding',
      'profile',
      'upload',
      'scout_verification'
    )
  ) ranked
  where rn > 1
);


-- ============================================================================
-- FILE: 20260418120000_scout_discovery_feed.sql
-- ============================================================================
-- Ranked talent discovery feed for verified scouts only (SECURITY DEFINER + gate).

create or replace function public.scout_discovery_feed(
  p_limit int default 20,
  p_offset int default 0,
  p_position text default null,
  p_country text default null,
  p_age_min int default null,
  p_age_max int default null,
  p_sort text default 'discovery'
)
returns table (
  video_id uuid,
  user_id uuid,
  video_url text,
  caption text,
  skill_type text,
  video_city text,
  video_country text,
  challenge_id uuid,
  video_created_at timestamptz,
  full_name text,
  username text,
  age int,
  bio text,
  position text,
  preferred_foot text,
  height int,
  weight int,
  profile_city text,
  profile_country text,
  club text,
  likes_count bigint,
  comments_count bigint,
  ai_overall_score numeric,
  profile_completeness int
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_ok boolean;
  v_order text;
  v_sort text;
  v_lim int := greatest(1, least(coalesce(p_limit, 20), 50));
  v_off int := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select
    (u.role = 'scout' and u.scout_verification_status = 'approved')
  into v_ok
  from public.users u
  where u.id = auth.uid();

  if not coalesce(v_ok, false) then
    raise exception 'not_verified_scout' using errcode = '42501';
  end if;

  v_sort := coalesce(nullif(trim(p_sort), ''), 'discovery');
  if v_sort not in ('discovery', 'newest', 'most_liked', 'highest_ai') then
    v_sort := 'discovery';
  end if;

  v_order := case v_sort
    when 'discovery' then
      'a.overall_score DESC NULLS LAST, l.cnt DESC, c.cnt DESC, comp.score DESC, v.created_at DESC'
    when 'newest' then
      'v.created_at DESC'
    when 'most_liked' then
      'l.cnt DESC, v.created_at DESC'
    when 'highest_ai' then
      'a.overall_score DESC NULLS LAST, v.created_at DESC'
    else
      'v.created_at DESC'
  end;

  return query execute format(
    $q$
    select
      v.id,
      v.user_id,
      v.video_url,
      v.caption,
      v.skill_type,
      v.city,
      v.country,
      v.challenge_id,
      v.created_at,
      pp.full_name,
      pp.username,
      pp.age,
      pp.bio,
      pp.position,
      pp.preferred_foot,
      pp.height,
      pp.weight,
      pp.city,
      pp.country,
      pp.club,
      l.cnt,
      c.cnt,
      a.overall_score,
      comp.score
    from public.videos v
    inner join public.player_profiles pp on pp.id = v.user_id
    left join public.ai_analyses a on a.video_id = v.id
    cross join lateral (
      select count(*)::bigint as cnt
      from public.likes l2
      where l2.video_id = v.id
    ) l
    cross join lateral (
      select count(*)::bigint as cnt
      from public.comments c2
      where c2.video_id = v.id
    ) c
    cross join lateral (
      select (
        (case when coalesce(trim(pp.full_name), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.username), '') <> '' then 1 else 0 end) +
        (case when pp.age is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.bio), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.position), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.preferred_foot), '') <> '' then 1 else 0 end) +
        (case when pp.height is not null then 1 else 0 end) +
        (case when pp.weight is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.city), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.country), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.club), '') <> '' then 1 else 0 end)
      )::int as score
    ) comp
    where v.video_url is not null
      and length(trim(v.video_url)) > 0
      and ($1 is null or coalesce(trim(pp.position), '') ilike ('%%' || trim($1) || '%%'))
      and (
        $2 is null
        or lower(trim(coalesce(pp.country, v.country, ''))) = lower(trim($2))
      )
      and ($3 is null or pp.age is null or pp.age >= $3)
      and ($4 is null or pp.age is null or pp.age <= $4)
    order by %s
    limit $5 offset $6
    $q$,
    v_order
  )
  using
    nullif(trim(p_position), ''),
    nullif(trim(p_country), ''),
    p_age_min,
    p_age_max,
    v_lim,
    v_off;
end;
$$;

revoke all on function public.scout_discovery_feed(int, int, text, text, int, int, text) from public;
grant execute on function public.scout_discovery_feed(int, int, text, text, int, int, text) to authenticated;

comment on function public.scout_discovery_feed is
  'Talent discovery for approved scouts: ranked videos + profile stats. Sort: discovery | newest | most_liked | highest_ai.';


-- ============================================================================
-- FILE: 20260418130000_scout_saved_players.sql
-- ============================================================================
-- Shortlist: verified scouts save player user ids they track.

create table if not exists public.scout_saved_players (
  scout_user_id uuid not null references public.users (id) on delete cascade,
  player_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (scout_user_id, player_user_id),
  constraint scout_saved_players_no_self check (scout_user_id <> player_user_id)
);

create index if not exists scout_saved_players_player_idx
  on public.scout_saved_players (player_user_id);

comment on table public.scout_saved_players is 'Approved scouts bookmark player profiles (shortlist).';

alter table public.scout_saved_players enable row level security;

create policy "scout_saved_players_select_own"
  on public.scout_saved_players
  for select
  to authenticated
  using (scout_user_id = auth.uid());

create policy "scout_saved_players_insert_approved"
  on public.scout_saved_players
  for insert
  to authenticated
  with check (
    scout_user_id = auth.uid()
    and scout_user_id <> player_user_id
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'scout'
        and u.scout_verification_status = 'approved'
    )
    and exists (
      select 1 from public.player_profiles pp where pp.id = player_user_id
    )
  );

create policy "scout_saved_players_delete_own"
  on public.scout_saved_players
  for delete
  to authenticated
  using (scout_user_id = auth.uid());

grant select, insert, delete on table public.scout_saved_players to authenticated;


-- ============================================================================
-- FILE: 20260419100000_scout_verification_applications.sql
-- ============================================================================
-- Dedicated scout application rows + RPC that upserts and syncs users.scout_verification_status.

create table if not exists public.scout_verification_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  full_name text not null,
  organization text not null,
  business_email text not null,
  country text not null,
  description text,
  web_url text,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  unique(user_id)
);

alter table public.scout_verification_applications enable row level security;

drop policy if exists "scout_verification_applications_select_own" on public.scout_verification_applications;
drop policy if exists "scout_verification_applications_insert_own" on public.scout_verification_applications;
drop policy if exists "scout_verification_applications_update_own" on public.scout_verification_applications;

create policy "scout_verification_applications_select_own"
on public.scout_verification_applications
for select
to authenticated
using (auth.uid() = user_id);

create policy "scout_verification_applications_insert_own"
on public.scout_verification_applications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "scout_verification_applications_update_own"
on public.scout_verification_applications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop function if exists public.submit_scout_verification_application(text, text, text, text, text, text);

create or replace function public.submit_scout_verification_application(
  p_business_email text,
  p_country text,
  p_description text,
  p_full_name text,
  p_organization text,
  p_web_url text
)
returns public.scout_verification_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.scout_verification_applications;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.scout_verification_applications (
    user_id,
    full_name,
    organization,
    business_email,
    country,
    description,
    web_url,
    status
  )
  values (
    v_user_id,
    p_full_name,
    p_organization,
    p_business_email,
    p_country,
    p_description,
    p_web_url,
    'pending'
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        organization = excluded.organization,
        business_email = excluded.business_email,
        country = excluded.country,
        description = excluded.description,
        web_url = excluded.web_url,
        status = 'pending';

  update public.users
  set scout_verification_status = 'pending'
  where id = v_user_id;

  select *
  into v_row
  from public.scout_verification_applications
  where user_id = v_user_id;

  return v_row;
end;
$$;

grant select, insert, update on table public.scout_verification_applications to authenticated;

revoke all on function public.submit_scout_verification_application(text, text, text, text, text, text) from public;
grant execute on function public.submit_scout_verification_application(text, text, text, text, text, text) to authenticated;


-- ============================================================================
-- FILE: 20260420120000_scout_verification_proof_documents.sql
-- ============================================================================
-- PitchRusch scout proof uploads — Supabase setup
--
-- • Private bucket: scout-verification-documents (public = false; no anon policies).
-- • storage.objects RLS: only role `authenticated`, paths under auth.uid()/… only.
-- • public.scout_verification_applications: proof_document_url (object path), _name, _type.
-- • submit_scout_verification_application RPC persists proof + sets user pending.

alter table if exists storage.objects enable row level security;

alter table public.scout_verification_applications
  add column if not exists proof_document_url text,
  add column if not exists proof_document_name text,
  add column if not exists proof_document_type text;

comment on column public.scout_verification_applications.proof_document_url is
  'Storage object path within bucket scout-verification-documents (not a public URL).';
comment on column public.scout_verification_applications.proof_document_name is
  'Original filename as uploaded.';
comment on column public.scout_verification_applications.proof_document_type is
  'MIME type of the proof file.';

-- Private bucket: no anonymous access; RLS below restricts authenticated users to own prefix.
insert into storage.buckets (id, name, public)
values ('scout-verification-documents', 'scout-verification-documents', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "scout_verification_docs_insert_own" on storage.objects;
drop policy if exists "scout_verification_docs_select_own" on storage.objects;
drop policy if exists "scout_verification_docs_update_own" on storage.objects;
drop policy if exists "scout_verification_docs_delete_own" on storage.objects;

create policy "scout_verification_docs_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "scout_verification_docs_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "scout_verification_docs_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "scout_verification_docs_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop function if exists public.submit_scout_verification_application(text, text, text, text, text, text);
drop function if exists public.submit_scout_verification_application(text, text, text, text, text, text, text, text, text);

create or replace function public.submit_scout_verification_application(
  p_business_email text,
  p_country text,
  p_description text,
  p_full_name text,
  p_organization text,
  p_web_url text,
  p_proof_document_url text,
  p_proof_document_name text,
  p_proof_document_type text
)
returns public.scout_verification_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.scout_verification_applications;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_proof_document_url is null
     or length(trim(p_proof_document_url)) = 0
     or p_proof_document_name is null
     or length(trim(p_proof_document_name)) = 0
     or p_proof_document_type is null
     or length(trim(p_proof_document_type)) = 0
  then
    raise exception 'Proof document metadata is required';
  end if;

  if split_part(trim(p_proof_document_url), '/', 1) <> v_user_id::text then
    raise exception 'Proof document path must be under the caller user id';
  end if;

  insert into public.scout_verification_applications (
    user_id,
    full_name,
    organization,
    business_email,
    country,
    description,
    web_url,
    status,
    proof_document_url,
    proof_document_name,
    proof_document_type
  )
  values (
    v_user_id,
    p_full_name,
    p_organization,
    p_business_email,
    p_country,
    p_description,
    p_web_url,
    'pending',
    trim(p_proof_document_url),
    trim(p_proof_document_name),
    trim(p_proof_document_type)
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        organization = excluded.organization,
        business_email = excluded.business_email,
        country = excluded.country,
        description = excluded.description,
        web_url = excluded.web_url,
        status = 'pending',
        proof_document_url = excluded.proof_document_url,
        proof_document_name = excluded.proof_document_name,
        proof_document_type = excluded.proof_document_type;

  update public.users
  set scout_verification_status = 'pending'
  where id = v_user_id;

  select *
  into v_row
  from public.scout_verification_applications
  where user_id = v_user_id;

  return v_row;
end;
$$;

revoke all on function public.submit_scout_verification_application(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_scout_verification_application(text, text, text, text, text, text, text, text, text) to authenticated;


-- ============================================================================
-- FILE: 20260421100000_admin_scout_verification_review.sql
-- ============================================================================
-- Admin flag, scout application review for admins, private proof access, notifications.

alter table public.users
  add column if not exists is_admin boolean not null default false;

comment on column public.users.is_admin is 'Platform admin (scout verification review, etc.). Set manually in DB.';

-- Notifications: decision outcomes (inserted by SECURITY DEFINER RPC).
alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'follow',
    'like',
    'comment',
    'message',
    'ai_analysis',
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification',
    'scout_verification_approved',
    'scout_verification_rejected'
  ));

drop index if exists notifications_user_onboarding_type_unique;

create unique index notifications_user_onboarding_type_unique
  on public.notifications (user_id, type)
  where type in (
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification'
  );

-- Admins: list all scout verification applications.
drop policy if exists "scout_verification_applications_select_admin" on public.scout_verification_applications;

create policy "scout_verification_applications_select_admin"
on public.scout_verification_applications
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and coalesce(u.is_admin, false) = true
  )
);

-- Admins: read any proof object in private bucket (signed URLs / download).
drop policy if exists "scout_verification_docs_select_admin" on storage.objects;

create policy "scout_verification_docs_select_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'scout-verification-documents'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and coalesce(u.is_admin, false) = true
  )
);

-- Approve / reject applicant; sync users.scout_verification_status; notify user.
create or replace function public.admin_review_scout_verification(
  p_subject_user_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_current text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(is_admin, false)
  into v_admin
  from public.users
  where id = auth.uid();

  if not coalesce(v_admin, false) then
    raise exception 'Forbidden';
  end if;

  if p_action is null or lower(trim(p_action)) not in ('approve', 'reject') then
    raise exception 'Invalid action';
  end if;

  select status
  into v_current
  from public.scout_verification_applications
  where user_id = p_subject_user_id;

  if not found then
    raise exception 'Application not found';
  end if;

  if lower(trim(p_action)) = 'approve' then
    if v_current = 'approved' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'approved'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'approved'
    where id = p_subject_user_id;

    insert into public.notifications (user_id, type, message, related_user_id)
    values (
      p_subject_user_id,
      'scout_verification_approved',
      'Your scout verification was approved.',
      p_subject_user_id
    );

  else
    if v_current = 'rejected' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'rejected'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'rejected'
    where id = p_subject_user_id;

    insert into public.notifications (user_id, type, message, related_user_id)
    values (
      p_subject_user_id,
      'scout_verification_rejected',
      'Your scout verification was not approved.',
      p_subject_user_id
    );
  end if;

  return jsonb_build_object('ok', true, 'noop', false);
end;
$$;

revoke all on function public.admin_review_scout_verification(uuid, text) from public;
grant execute on function public.admin_review_scout_verification(uuid, text) to authenticated;


-- ============================================================================
-- FILE: 20260422120000_scout_verification_decision_notifications.sql
-- ============================================================================
-- Scout verification admin decisions: use type `scout_verification` with explicit messages.
-- Allow multiple `scout_verification` rows per user (onboarding prompt + decisions).
-- Notification insert failures must not roll back approve/reject (SAVEPOINT + EXCEPTION).

update public.notifications
set type = 'scout_verification'
where type in ('scout_verification_approved', 'scout_verification_rejected');

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'follow',
    'like',
    'comment',
    'message',
    'ai_analysis',
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification'
  ));

drop index if exists notifications_user_onboarding_type_unique;

create unique index notifications_user_onboarding_type_unique
  on public.notifications (user_id, type)
  where type in (
    'welcome',
    'onboarding',
    'profile',
    'upload'
  );

create or replace function public.admin_review_scout_verification(
  p_subject_user_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_current text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(is_admin, false)
  into v_admin
  from public.users
  where id = auth.uid();

  if not coalesce(v_admin, false) then
    raise exception 'Forbidden';
  end if;

  if p_action is null or lower(trim(p_action)) not in ('approve', 'reject') then
    raise exception 'Invalid action';
  end if;

  select status
  into v_current
  from public.scout_verification_applications
  where user_id = p_subject_user_id;

  if not found then
    raise exception 'Application not found';
  end if;

  if lower(trim(p_action)) = 'approve' then
    if v_current = 'approved' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'approved'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'approved'
    where id = p_subject_user_id;

    begin
      savepoint admin_scout_verification_notify;
      insert into public.notifications (user_id, type, message, related_user_id)
      values (
        p_subject_user_id,
        'scout_verification',
        'Your scout verification was approved.',
        p_subject_user_id
      );
    exception
      when others then
        rollback to savepoint admin_scout_verification_notify;
    end;

  else
    if v_current = 'rejected' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'rejected'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'rejected'
    where id = p_subject_user_id;

    begin
      savepoint admin_scout_verification_notify;
      insert into public.notifications (user_id, type, message, related_user_id)
      values (
        p_subject_user_id,
        'scout_verification',
        'Your scout verification was not approved.',
        p_subject_user_id
      );
    exception
      when others then
        rollback to savepoint admin_scout_verification_notify;
    end;
  end if;

  return jsonb_build_object('ok', true, 'noop', false);
end;
$$;


-- ============================================================================
-- FILE: 20260423130000_goalnova_admin_system.sql
-- ============================================================================
-- PitchRusch admin system: roles, soft flags, support tickets, moderation reports, audit log, RPCs.

-- ---------------------------------------------------------------------------
-- 1) users: admin_role, suspension, soft delete
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists admin_role text
    check (admin_role is null or admin_role in ('super_admin', 'support_admin', 'moderator'));

alter table public.users
  add column if not exists is_suspended boolean not null default false;

alter table public.users
  add column if not exists is_deleted boolean not null default false;

comment on column public.users.admin_role is 'Staff role: super_admin | support_admin | moderator. NULL = not staff. Legacy is_admin still grants super_admin-equivalent checks until migrated.';
comment on column public.users.is_suspended is 'Account suspended by admin; app should block sign-in / actions via RLS or app layer.';
comment on column public.users.is_deleted is 'Soft-deleted user; hide from public lists; super_admin only to set.';

update public.users
set admin_role = 'super_admin'
where coalesce(is_admin, false) = true
  and admin_role is null;

-- ---------------------------------------------------------------------------
-- 2) support_tickets
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_admin_id uuid references public.users (id) on delete set null,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_assigned_admin_id_idx on public.support_tickets (assigned_admin_id);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);

alter table public.support_tickets enable row level security;

-- ---------------------------------------------------------------------------
-- 3) moderation_reports (user-submitted or admin-created stubs)
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.users (id) on delete set null,
  target_type text not null check (target_type in ('video', 'comment')),
  target_id uuid not null,
  reason text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  assigned_admin_id uuid references public.users (id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moderation_reports_status_idx on public.moderation_reports (status);
create index if not exists moderation_reports_assigned_idx on public.moderation_reports (assigned_admin_id);

alter table public.moderation_reports enable row level security;

-- ---------------------------------------------------------------------------
-- 4) admin_audit_log
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.users (id) on delete set null,
  target_user_id uuid references public.users (id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_admin_user_id_idx on public.admin_audit_log (admin_user_id);

alter table public.admin_audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- 5) Helpers: effective staff role (legacy is_admin => super_admin)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_staff_effective_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when u.admin_role is not null then u.admin_role
    when coalesce(u.is_admin, false) then 'super_admin'::text
    else null
  end
  from public.users u
  where u.id = auth.uid();
$$;

create or replace function public.goalnova_staff_effective_role(p_uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when u.admin_role is not null then u.admin_role
    when coalesce(u.is_admin, false) then 'super_admin'::text
    else null
  end
  from public.users u
  where u.id = p_uid;
$$;

revoke all on function public.goalnova_staff_effective_role() from public;
grant execute on function public.goalnova_staff_effective_role() to authenticated;

revoke all on function public.goalnova_staff_effective_role(uuid) from public;
grant execute on function public.goalnova_staff_effective_role(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Audit append (internal use from other RPCs)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_audit_log(
  p_target_user_id uuid,
  p_action text,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  insert into public.admin_audit_log (admin_user_id, target_user_id, action, details)
  values (auth.uid(), p_target_user_id, p_action, p_details);
end;
$$;

revoke all on function public.goalnova_admin_audit_log(uuid, text, jsonb) from public;
grant execute on function public.goalnova_admin_audit_log(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Scout verification: super_admin only (not support / moderator)
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_scout_verification(
  p_subject_user_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_current text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_role := public.goalnova_staff_effective_role();
  if v_role is null or v_role <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  if p_action is null or lower(trim(p_action)) not in ('approve', 'reject') then
    raise exception 'Invalid action';
  end if;

  select status
  into v_current
  from public.scout_verification_applications
  where user_id = p_subject_user_id;

  if not found then
    raise exception 'Application not found';
  end if;

  if lower(trim(p_action)) = 'approve' then
    if v_current = 'approved' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'approved'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'approved'
    where id = p_subject_user_id;

    perform public.goalnova_admin_audit_log(
      p_subject_user_id,
      'scout_verification_approve',
      jsonb_build_object('subject', p_subject_user_id)
    );

    begin
      savepoint admin_scout_verification_notify;
      insert into public.notifications (user_id, type, message, related_user_id)
      values (
        p_subject_user_id,
        'scout_verification',
        'Your scout verification was approved.',
        p_subject_user_id
      );
    exception
      when others then
        rollback to savepoint admin_scout_verification_notify;
    end;

  else
    if v_current = 'rejected' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'rejected'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'rejected'
    where id = p_subject_user_id;

    perform public.goalnova_admin_audit_log(
      p_subject_user_id,
      'scout_verification_reject',
      jsonb_build_object('subject', p_subject_user_id)
    );

    begin
      savepoint admin_scout_verification_notify;
      insert into public.notifications (user_id, type, message, related_user_id)
      values (
        p_subject_user_id,
        'scout_verification',
        'Your scout verification was not approved.',
        p_subject_user_id
      );
    exception
      when others then
        rollback to savepoint admin_scout_verification_notify;
    end;
  end if;

  return jsonb_build_object('ok', true, 'noop', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) List users (staff)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_list_users(
  p_limit int default 50,
  p_offset int default 0,
  p_search text default null
)
returns table (
  id uuid,
  email text,
  role text,
  admin_role text,
  is_premium boolean,
  scout_verification_status text,
  is_suspended boolean,
  is_deleted boolean,
  created_at timestamptz,
  full_name text,
  username text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_search text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  v_search := nullif(trim(coalesce(p_search, '')), '');

  return query
  select
    u.id,
    u.email,
    u.role,
    u.admin_role,
    u.is_premium,
    u.scout_verification_status,
    u.is_suspended,
    u.is_deleted,
    u.created_at,
    pp.full_name,
    pp.username
  from public.users u
  left join public.player_profiles pp on pp.id = u.id
  where
    (v_staff = 'super_admin' or u.is_deleted = false)
    and (
      v_search is null
      or u.email ilike '%' || v_search || '%'
      or coalesce(pp.full_name, '') ilike '%' || v_search || '%'
      or coalesce(pp.username, '') ilike '%' || v_search || '%'
    )
  order by u.created_at desc nulls last
  limit greatest(1, least(p_limit, 200))
  offset greatest(0, p_offset);
end;
$$;

revoke all on function public.goalnova_admin_list_users(int, int, text) from public;
grant execute on function public.goalnova_admin_list_users(int, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) User detail JSON (staff)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user jsonb;
  v_player jsonb;
  v_scout jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select to_jsonb(u.*)
  into v_user
  from public.users u
  where u.id = p_user_id;

  if v_user is null then
    return null;
  end if;

  if v_staff <> 'super_admin' and coalesce((v_user->>'is_deleted')::boolean, false) then
    raise exception 'Forbidden';
  end if;

  select to_jsonb(pp.*)
  into v_player
  from public.player_profiles pp
  where pp.id = p_user_id;

  select to_jsonb(sp.*)
  into v_scout
  from public.scout_profiles sp
  where sp.id = p_user_id;

  return jsonb_build_object(
    'user', v_user,
    'player_profile', v_player,
    'scout_profile', v_scout
  );
end;
$$;

revoke all on function public.goalnova_admin_get_user_detail(uuid) from public;
grant execute on function public.goalnova_admin_get_user_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Suspend / soft delete / premium / scout status / staff role (RBAC)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_set_suspended(
  p_user_id uuid,
  p_suspended boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or (v_staff = 'support_admin') then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_suspended = p_suspended
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_suspended',
    jsonb_build_object('suspended', p_suspended)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_deleted(
  p_user_id uuid,
  p_deleted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_deleted = p_deleted
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_deleted',
    jsonb_build_object('deleted', p_deleted)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_premium(
  p_user_id uuid,
  p_premium boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_premium = p_premium
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_premium',
    jsonb_build_object('is_premium', p_premium)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_scout_verification_status(
  p_user_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  v_status := lower(trim(p_status));
  if v_status not in ('none', 'pending', 'approved', 'rejected') then
    raise exception 'Invalid status';
  end if;

  update public.users
  set scout_verification_status = v_status
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_scout_verification_status',
    jsonb_build_object('status', v_status)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_staff_role(
  p_user_id uuid,
  p_admin_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  if p_admin_role is null or trim(p_admin_role) = '' then
    update public.users
    set admin_role = null, is_admin = false
    where id = p_user_id;
    perform public.goalnova_admin_audit_log(
      p_user_id,
      'revoke_staff_role',
      null
    );
    return jsonb_build_object('ok', true);
  end if;

  v_role := lower(trim(p_admin_role));
  if v_role not in ('super_admin', 'support_admin', 'moderator') then
    raise exception 'Invalid admin_role';
  end if;

  update public.users
  set
    admin_role = v_role,
    is_admin = true
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_staff_role',
    jsonb_build_object('admin_role', v_role)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_app_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  v_role := lower(trim(p_role));
  if v_role not in ('player', 'scout') then
    raise exception 'Invalid role';
  end if;

  update public.users
  set role = v_role
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_app_role',
    jsonb_build_object('role', v_role)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_set_suspended(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_suspended(uuid, boolean) to authenticated;

revoke all on function public.goalnova_admin_set_deleted(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_deleted(uuid, boolean) to authenticated;

revoke all on function public.goalnova_admin_set_premium(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_premium(uuid, boolean) to authenticated;

revoke all on function public.goalnova_admin_set_scout_verification_status(uuid, text) from public;
grant execute on function public.goalnova_admin_set_scout_verification_status(uuid, text) to authenticated;

revoke all on function public.goalnova_admin_set_staff_role(uuid, text) from public;
grant execute on function public.goalnova_admin_set_staff_role(uuid, text) to authenticated;

revoke all on function public.goalnova_admin_set_app_role(uuid, text) from public;
grant execute on function public.goalnova_admin_set_app_role(uuid, text) to authenticated;

-- Fix: support_admin should NOT suspend per spec — only super + moderator.
-- Re-read user message: "support_admin ... cannot hard delete" — suspend not listed for support.
-- "moderator can ... suspend problematic accounts"
-- "super_admin can ... suspend users"
-- So suspend: super_admin + moderator only. Current goalnova_admin_set_suspended already blocks support_admin. Good.

-- ---------------------------------------------------------------------------
-- 11) Merge player profile (JSON patch, RBAC)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_merge_player_profile(
  p_user_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  k text;
  allowed_support text[] := array[
    'full_name', 'username', 'bio', 'city', 'country', 'position',
    'club', 'age', 'height', 'weight', 'preferred_foot'
  ];
  allowed_super text[] := array[
    'full_name', 'username', 'bio', 'city', 'country', 'position',
    'club', 'age', 'height', 'weight', 'preferred_foot'
  ];
  allowed_mod text[] := array[]::text[];
  keys text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  if p_patch is null or p_patch = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  keys := array(select jsonb_object_keys(p_patch));
  FOREACH k IN ARRAY keys
  loop
    if v_staff = 'super_admin' then
      if not (k = any(allowed_super)) then
        raise exception 'Invalid player profile field: %', k;
      end if;
    elsif v_staff = 'support_admin' then
      if not (k = any(allowed_support)) then
        raise exception 'Forbidden field for support: %', k;
      end if;
    else
      if not (k = any(allowed_mod)) then
        raise exception 'Forbidden';
      end if;
    end if;
  end loop;

  insert into public.player_profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  update public.player_profiles pp
  set
    full_name = case when p_patch ? 'full_name' then nullif(p_patch->>'full_name', '') else pp.full_name end,
    username = case when p_patch ? 'username' then nullif(p_patch->>'username', '') else pp.username end,
    bio = case when p_patch ? 'bio' then nullif(p_patch->>'bio', '') else pp.bio end,
    city = case when p_patch ? 'city' then nullif(p_patch->>'city', '') else pp.city end,
    country = case when p_patch ? 'country' then nullif(p_patch->>'country', '') else pp.country end,
    position = case when p_patch ? 'position' then nullif(p_patch->>'position', '') else pp.position end,
    club = case when p_patch ? 'club' then nullif(p_patch->>'club', '') else pp.club end,
    age = case when p_patch ? 'age' then (nullif(p_patch->>'age', ''))::int else pp.age end,
    height = case when p_patch ? 'height' then (nullif(p_patch->>'height', ''))::int else pp.height end,
    weight = case when p_patch ? 'weight' then (nullif(p_patch->>'weight', ''))::int else pp.weight end,
    preferred_foot = case when p_patch ? 'preferred_foot' then nullif(p_patch->>'preferred_foot', '') else pp.preferred_foot end
  where pp.id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'merge_player_profile',
    p_patch
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_merge_player_profile(uuid, jsonb) from public;
grant execute on function public.goalnova_admin_merge_player_profile(uuid, jsonb) to authenticated;
-- ---------------------------------------------------------------------------
-- 12) Merge scout profile (RBAC)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_merge_scout_profile(
  p_user_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  k text;
  allowed_support text[] := array['bio', 'organization', 'role', 'city', 'country'];
  allowed_super text[] := array['bio', 'organization', 'role', 'city', 'country'];
  keys text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  if p_patch is null or p_patch = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  keys := array(select jsonb_object_keys(p_patch));
  FOREACH k IN ARRAY keys
  loop
    if v_staff = 'super_admin' then
      if not (k = any(allowed_super)) then
        raise exception 'Invalid scout profile field: %', k;
      end if;
    elsif v_staff = 'support_admin' then
      if not (k = any(allowed_support)) then
        raise exception 'Forbidden field for support: %', k;
      end if;
    else
      raise exception 'Forbidden';
    end if;
  end loop;

  insert into public.scout_profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  update public.scout_profiles sp
  set
    bio = case when p_patch ? 'bio' then nullif(p_patch->>'bio', '') else sp.bio end,
    organization = case when p_patch ? 'organization' then nullif(p_patch->>'organization', '') else sp.organization end,
    role = case when p_patch ? 'role' then nullif(p_patch->>'role', '') else sp.role end,
    city = case when p_patch ? 'city' then nullif(p_patch->>'city', '') else sp.city end,
    country = case when p_patch ? 'country' then nullif(p_patch->>'country', '') else sp.country end
  where sp.id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'merge_scout_profile',
    p_patch
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_merge_scout_profile(uuid, jsonb) from public;
grant execute on function public.goalnova_admin_merge_scout_profile(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 13) Merge scout application columns on users (super + support)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_merge_scout_apply_fields(
  p_user_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  k text;
  allowed text[] := array[
    'scout_apply_full_name', 'scout_apply_organization', 'scout_apply_business_email',
    'scout_apply_country', 'scout_apply_description', 'scout_apply_web_url'
  ];
  keys text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'moderator' then
    raise exception 'Forbidden';
  end if;

  if p_patch is null or p_patch = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  keys := array(select jsonb_object_keys(p_patch));
  FOREACH k IN ARRAY keys
  loop
    if not (k = any(allowed)) then
      raise exception 'Invalid field: %', k;
    end if;
  end loop;

  update public.users u
  set
    scout_apply_full_name = case when p_patch ? 'scout_apply_full_name' then nullif(p_patch->>'scout_apply_full_name', '') else u.scout_apply_full_name end,
    scout_apply_organization = case when p_patch ? 'scout_apply_organization' then nullif(p_patch->>'scout_apply_organization', '') else u.scout_apply_organization end,
    scout_apply_business_email = case when p_patch ? 'scout_apply_business_email' then nullif(p_patch->>'scout_apply_business_email', '') else u.scout_apply_business_email end,
    scout_apply_country = case when p_patch ? 'scout_apply_country' then nullif(p_patch->>'scout_apply_country', '') else u.scout_apply_country end,
    scout_apply_description = case when p_patch ? 'scout_apply_description' then nullif(p_patch->>'scout_apply_description', '') else u.scout_apply_description end,
    scout_apply_web_url = case when p_patch ? 'scout_apply_web_url' then nullif(p_patch->>'scout_apply_web_url', '') else u.scout_apply_web_url end
  where u.id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'merge_scout_apply_fields',
    p_patch
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_merge_scout_apply_fields(uuid, jsonb) from public;
grant execute on function public.goalnova_admin_merge_scout_apply_fields(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 14) Support tickets
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_create_support_ticket(
  p_subject text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_uid := auth.uid();
  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  insert into public.support_tickets (user_id, subject, message)
  values (v_uid, trim(p_subject), trim(p_message))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.goalnova_create_support_ticket(text, text) from public;
grant execute on function public.goalnova_create_support_ticket(text, text) to authenticated;

create or replace function public.goalnova_admin_list_support_tickets(
  p_status text default null,
  p_assigned_to_me boolean default false,
  p_limit int default 100
)
returns setof public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  v_status := nullif(lower(trim(coalesce(p_status, ''))), '');

  return query
  select t.*
  from public.support_tickets t
  where
    (v_status is null or t.status = v_status)
    and (
      not p_assigned_to_me
      or t.assigned_admin_id = auth.uid()
    )
  order by t.created_at desc
  limit greatest(1, least(p_limit, 500));
end;
$$;

revoke all on function public.goalnova_admin_list_support_tickets(text, boolean, int) from public;
grant execute on function public.goalnova_admin_list_support_tickets(text, boolean, int) to authenticated;

create or replace function public.goalnova_admin_update_support_ticket(
  p_ticket_id uuid,
  p_status text default null,
  p_priority text default null,
  p_assigned_admin_id uuid default null,
  p_internal_note text default null,
  p_clear_assignment boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_status text;
  v_pri text;
  v_ticket_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select user_id into v_ticket_user from public.support_tickets where id = p_ticket_id;
  if v_ticket_user is null then
    raise exception 'Ticket not found';
  end if;

  if p_status is not null and trim(p_status) <> '' then
    v_status := lower(trim(p_status));
    if v_status not in ('open', 'in_progress', 'resolved', 'closed') then
      raise exception 'Invalid status';
    end if;
  end if;

  if p_priority is not null and trim(p_priority) <> '' then
    v_pri := lower(trim(p_priority));
    if v_pri not in ('low', 'normal', 'high', 'urgent') then
      raise exception 'Invalid priority';
    end if;
  end if;

  if p_assigned_admin_id is not null and v_staff <> 'super_admin' then
    if p_assigned_admin_id <> auth.uid() then
      raise exception 'Forbidden';
    end if;
  end if;

  update public.support_tickets t
  set
    status = coalesce(v_status, t.status),
    priority = coalesce(v_pri, t.priority),
    assigned_admin_id = case
      when p_clear_assignment then null
      when p_assigned_admin_id is not null then p_assigned_admin_id
      else t.assigned_admin_id
    end,
    internal_note = coalesce(p_internal_note, t.internal_note),
    updated_at = now()
  where t.id = p_ticket_id;

  perform public.goalnova_admin_audit_log(
    v_ticket_user,
    'support_ticket_update',
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'status', p_status,
      'priority', p_priority,
      'assigned_admin_id', p_assigned_admin_id,
      'clear_assignment', p_clear_assignment
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_update_support_ticket(uuid, text, text, uuid, text, boolean) from public;
grant execute on function public.goalnova_admin_update_support_ticket(uuid, text, text, uuid, text, boolean) to authenticated;

create or replace function public.goalnova_admin_create_support_ticket_for_user(
  p_user_id uuid,
  p_subject text,
  p_message text,
  p_assigned_admin_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'moderator' then
    raise exception 'Forbidden';
  end if;

  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  if p_assigned_admin_id is not null and v_staff <> 'super_admin' and p_assigned_admin_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  insert into public.support_tickets (user_id, subject, message, assigned_admin_id, status)
  values (
    p_user_id,
    trim(p_subject),
    trim(p_message),
    p_assigned_admin_id,
    'open'
  )
  returning id into v_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'support_ticket_created_by_admin',
    jsonb_build_object('ticket_id', v_id, 'assigned_admin_id', p_assigned_admin_id)
  );

  return v_id;
end;
$$;

revoke all on function public.goalnova_admin_create_support_ticket_for_user(uuid, text, text, uuid) from public;
grant execute on function public.goalnova_admin_create_support_ticket_for_user(uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 15) Moderation: delete video / comment (moderator + super_admin)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_delete_video(p_video_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  select user_id into v_owner from public.videos where id = p_video_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.videos where id = p_video_id;

  perform public.goalnova_admin_audit_log(
    v_owner,
    'delete_video',
    jsonb_build_object('video_id', p_video_id)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_delete_comment(p_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  select user_id into v_user from public.comments where id = p_comment_id;
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.comments where id = p_comment_id;

  perform public.goalnova_admin_audit_log(
    v_user,
    'delete_comment',
    jsonb_build_object('comment_id', p_comment_id)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_delete_video(uuid) from public;
grant execute on function public.goalnova_admin_delete_video(uuid) to authenticated;

revoke all on function public.goalnova_admin_delete_comment(uuid) from public;
grant execute on function public.goalnova_admin_delete_comment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 16) Moderation reports
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_list_moderation_reports(
  p_status text default 'open',
  p_limit int default 100
)
returns setof public.moderation_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_st text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  v_st := coalesce(nullif(lower(trim(p_status)), ''), 'open');

  return query
  select r.*
  from public.moderation_reports r
  where r.status = v_st
  order by r.created_at desc
  limit greatest(1, least(p_limit, 300));
end;
$$;

create or replace function public.goalnova_admin_update_moderation_report(
  p_report_id uuid,
  p_status text,
  p_assigned_admin_id uuid default null,
  p_resolution_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_st text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  v_st := lower(trim(p_status));
  if v_st not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid status';
  end if;

  update public.moderation_reports r
  set
    status = v_st,
    assigned_admin_id = coalesce(p_assigned_admin_id, r.assigned_admin_id),
    resolution_note = coalesce(p_resolution_note, r.resolution_note),
    updated_at = now()
  where r.id = p_report_id;

  perform public.goalnova_admin_audit_log(
    null,
    'moderation_report_update',
    jsonb_build_object('report_id', p_report_id, 'status', v_st)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_list_moderation_reports(text, int) from public;
grant execute on function public.goalnova_admin_list_moderation_reports(text, int) to authenticated;

revoke all on function public.goalnova_admin_update_moderation_report(uuid, text, uuid, text) from public;
grant execute on function public.goalnova_admin_update_moderation_report(uuid, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 17) Audit log read
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_list_audit_log(p_limit int default 100)
returns setof public.admin_audit_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  return query
  select a.*
  from public.admin_audit_log a
  order by a.created_at desc
  limit greatest(1, least(p_limit, case when v_staff = 'super_admin' then 500 else 200 end));
end;
$$;

revoke all on function public.goalnova_admin_list_audit_log(int) from public;
grant execute on function public.goalnova_admin_list_audit_log(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 18) Scout verification RLS: any staff can read applications (approve still super-only RPC)
-- ---------------------------------------------------------------------------
drop policy if exists "scout_verification_applications_select_admin" on public.scout_verification_applications;

create policy "scout_verification_applications_select_admin"
  on public.scout_verification_applications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and (
          coalesce(u.is_admin, false)
          or u.admin_role is not null
        )
    )
  );

drop policy if exists "scout_verification_docs_select_admin" on storage.objects;

create policy "scout_verification_docs_select_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'scout-verification-documents'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and (
          coalesce(u.is_admin, false)
          or u.admin_role is not null
        )
    )
  );


-- ============================================================================
-- FILE: 20260423130100_goalnova_admin_list_staff.sql
-- ============================================================================
-- Staff directory for super-admin assignment UIs.
create or replace function public.goalnova_admin_list_staff_users()
returns table (
  id uuid,
  email text,
  admin_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select u.id, u.email, u.admin_role
  from public.users u
  where u.admin_role is not null or coalesce(u.is_admin, false) = true
  order by u.email nulls last;
end;
$$;

revoke all on function public.goalnova_admin_list_staff_users() from public;
grant execute on function public.goalnova_admin_list_staff_users() to authenticated;


-- ============================================================================
-- FILE: 20260423140000_notifications_challenge_support.sql
-- ============================================================================
-- Challenge in-app notifications: optional FK + type `challenge`, staff-only broadcast RPC.

alter table public.notifications
  add column if not exists related_challenge_id uuid references public.challenges (id) on delete set null;

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'follow',
    'like',
    'comment',
    'message',
    'ai_analysis',
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification',
    'challenge'
  ));

create index if not exists notifications_related_challenge_id_idx
  on public.notifications (related_challenge_id)
  where related_challenge_id is not null;

-- ---------------------------------------------------------------------------
-- Staff: notify all non-deleted players about an active challenge (idempotent per user+challenge).
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_notify_players_about_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_title text;
  v_status text;
  v_msg text;
  v_inserted int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select c.title, c.status
  into v_title, v_status
  from public.challenges c
  where c.id = p_challenge_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'challenge_not_found');
  end if;

  if v_status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'error', 'challenge_not_active');
  end if;

  v_msg := case
    when v_title is not null and length(trim(v_title)) > 0
      then 'New challenge: ' || trim(v_title)
    else 'New challenge'
  end;

  insert into public.notifications (
    user_id,
    type,
    message,
    related_user_id,
    related_video_id,
    related_challenge_id
  )
  select
    u.id,
    'challenge',
    v_msg,
    u.id,
    null,
    p_challenge_id
  from public.users u
  where u.role = 'player'
    and coalesce(u.is_deleted, false) = false
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = u.id
        and n.type = 'challenge'
        and n.related_challenge_id = p_challenge_id
    );

  get diagnostics v_inserted = row_count;

  return jsonb_build_object('ok', true, 'inserted', v_inserted);
end;
$$;

revoke all on function public.goalnova_notify_players_about_challenge(uuid) from public;
grant execute on function public.goalnova_notify_players_about_challenge(uuid) to authenticated;


-- ============================================================================
-- FILE: 20260423141000_scout_discovery_feed_player_position.sql
-- ============================================================================
-- Return profile position as `player_position` (distinct from filter arg `p_position`).

create or replace function public.scout_discovery_feed(
  p_limit int default 20,
  p_offset int default 0,
  p_position text default null,
  p_country text default null,
  p_age_min int default null,
  p_age_max int default null,
  p_sort text default 'discovery'
)
returns table (
  video_id uuid,
  user_id uuid,
  video_url text,
  caption text,
  skill_type text,
  video_city text,
  video_country text,
  challenge_id uuid,
  video_created_at timestamptz,
  full_name text,
  username text,
  age int,
  bio text,
  player_position text,
  preferred_foot text,
  height int,
  weight int,
  profile_city text,
  profile_country text,
  club text,
  likes_count bigint,
  comments_count bigint,
  ai_overall_score numeric,
  profile_completeness int
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_ok boolean;
  v_order text;
  v_sort text;
  v_lim int := greatest(1, least(coalesce(p_limit, 20), 50));
  v_off int := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select
    (u.role = 'scout' and u.scout_verification_status = 'approved')
  into v_ok
  from public.users u
  where u.id = auth.uid();

  if not coalesce(v_ok, false) then
    raise exception 'not_verified_scout' using errcode = '42501';
  end if;

  v_sort := coalesce(nullif(trim(p_sort), ''), 'discovery');
  if v_sort not in ('discovery', 'newest', 'most_liked', 'highest_ai') then
    v_sort := 'discovery';
  end if;

  v_order := case v_sort
    when 'discovery' then
      'a.overall_score DESC NULLS LAST, l.cnt DESC, c.cnt DESC, comp.score DESC, v.created_at DESC'
    when 'newest' then
      'v.created_at DESC'
    when 'most_liked' then
      'l.cnt DESC, v.created_at DESC'
    when 'highest_ai' then
      'a.overall_score DESC NULLS LAST, v.created_at DESC'
    else
      'v.created_at DESC'
  end;

  return query execute format(
    $q$
    select
      v.id,
      v.user_id,
      v.video_url,
      v.caption,
      v.skill_type,
      v.city,
      v.country,
      v.challenge_id,
      v.created_at,
      pp.full_name,
      pp.username,
      pp.age,
      pp.bio,
      pp.position as player_position,
      pp.preferred_foot,
      pp.height,
      pp.weight,
      pp.city,
      pp.country,
      pp.club,
      l.cnt,
      c.cnt,
      a.overall_score,
      comp.score
    from public.videos v
    inner join public.player_profiles pp on pp.id = v.user_id
    left join public.ai_analyses a on a.video_id = v.id
    cross join lateral (
      select count(*)::bigint as cnt
      from public.likes l2
      where l2.video_id = v.id
    ) l
    cross join lateral (
      select count(*)::bigint as cnt
      from public.comments c2
      where c2.video_id = v.id
    ) c
    cross join lateral (
      select (
        (case when coalesce(trim(pp.full_name), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.username), '') <> '' then 1 else 0 end) +
        (case when pp.age is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.bio), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.position), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.preferred_foot), '') <> '' then 1 else 0 end) +
        (case when pp.height is not null then 1 else 0 end) +
        (case when pp.weight is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.city), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.country), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.club), '') <> '' then 1 else 0 end)
      )::int as score
    ) comp
    where v.video_url is not null
      and length(trim(v.video_url)) > 0
      and ($1 is null or coalesce(trim(pp.position), '') ilike ('%%' || trim($1) || '%%'))
      and (
        $2 is null
        or lower(trim(coalesce(pp.country, v.country, ''))) = lower(trim($2))
      )
      and ($3 is null or pp.age is null or pp.age >= $3)
      and ($4 is null or pp.age is null or pp.age <= $4)
    order by %s
    limit $5 offset $6
    $q$,
    v_order
  )
  using
    nullif(trim(p_position), ''),
    nullif(trim(p_country), ''),
    p_age_min,
    p_age_max,
    v_lim,
    v_off;
end;
$$;

revoke all on function public.scout_discovery_feed(int, int, text, text, int, int, text) from public;
grant execute on function public.scout_discovery_feed(int, int, text, text, int, int, text) to authenticated;

comment on function public.scout_discovery_feed is
  'Talent discovery for approved scouts: ranked videos + profile stats. Sort: discovery | newest | most_liked | highest_ai.';


-- ============================================================================
-- FILE: 20260423150000_notifications_ensure_related_challenge_id.sql
-- ============================================================================
-- Ensure challenge-linked notifications column exists (idempotent).
-- Older deployments may have skipped 20260423140000_notifications_challenge_support.sql.

alter table public.notifications
  add column if not exists related_challenge_id uuid references public.challenges (id) on delete set null;

create index if not exists notifications_related_challenge_id_idx
  on public.notifications (related_challenge_id)
  where related_challenge_id is not null;


-- ============================================================================
-- FILE: 20260424160000_ensure_videos_selected_music_track_id.sql
-- ============================================================================
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


-- ============================================================================
-- FILE: 20260425120000_video_music_merge_fields.sql
-- ============================================================================
-- Video + music merge: store trim/volume and optional original upload URL.

alter table public.videos
  add column if not exists source_video_url text;

alter table public.videos
  add column if not exists music_start_seconds double precision not null default 0;

alter table public.videos
  add column if not exists music_end_seconds double precision;

alter table public.videos
  add column if not exists music_volume double precision not null default 1;

comment on column public.videos.source_video_url is 'Original file URL when video_url points to FFmpeg-merged output with library music.';
comment on column public.videos.music_start_seconds is 'Start offset (seconds) into selected music track for merge.';
comment on column public.videos.music_end_seconds is 'End offset (seconds) into music track; null treated as min(track length, video length) from start.';
comment on column public.videos.music_volume is 'Linear gain applied to merged music (1 = 100%).';


-- ============================================================================
-- FILE: 20260425120100_videos_processed_video_url.sql
-- ============================================================================
-- Explicit URL for FFmpeg-merged output (library music). Null when no server-side processing ran.

alter table public.videos
  add column if not exists processed_video_url text;

comment on column public.videos.processed_video_url is
  'Public URL of the post-processed (e.g. music-merged) video. Null when video_url is the only asset (no merge).';


-- ============================================================================
-- FILE: 20260425120300_scout_discovery_feed_playback_urls.sql
-- ============================================================================
-- Include processed/source video URLs so scout discovery playback matches app-wide resolution
-- (processed_video_url → video_url → source_video_url).

create or replace function public.scout_discovery_feed(
  p_limit int default 20,
  p_offset int default 0,
  p_position text default null,
  p_country text default null,
  p_age_min int default null,
  p_age_max int default null,
  p_sort text default 'discovery'
)
returns table (
  video_id uuid,
  user_id uuid,
  video_url text,
  processed_video_url text,
  source_video_url text,
  caption text,
  skill_type text,
  video_city text,
  video_country text,
  challenge_id uuid,
  video_created_at timestamptz,
  full_name text,
  username text,
  age int,
  bio text,
  player_position text,
  preferred_foot text,
  height int,
  weight int,
  profile_city text,
  profile_country text,
  club text,
  likes_count bigint,
  comments_count bigint,
  ai_overall_score numeric,
  profile_completeness int
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_ok boolean;
  v_order text;
  v_sort text;
  v_lim int := greatest(1, least(coalesce(p_limit, 20), 50));
  v_off int := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select
    (u.role = 'scout' and u.scout_verification_status = 'approved')
  into v_ok
  from public.users u
  where u.id = auth.uid();

  if not coalesce(v_ok, false) then
    raise exception 'not_verified_scout' using errcode = '42501';
  end if;

  v_sort := coalesce(nullif(trim(p_sort), ''), 'discovery');
  if v_sort not in ('discovery', 'newest', 'most_liked', 'highest_ai') then
    v_sort := 'discovery';
  end if;

  v_order := case v_sort
    when 'discovery' then
      'a.overall_score DESC NULLS LAST, l.cnt DESC, c.cnt DESC, comp.score DESC, v.created_at DESC'
    when 'newest' then
      'v.created_at DESC'
    when 'most_liked' then
      'l.cnt DESC, v.created_at DESC'
    when 'highest_ai' then
      'a.overall_score DESC NULLS LAST, v.created_at DESC'
    else
      'v.created_at DESC'
  end;

  return query execute format(
    $q$
    select
      v.id,
      v.user_id,
      v.video_url,
      v.processed_video_url,
      v.source_video_url,
      v.caption,
      v.skill_type,
      v.city,
      v.country,
      v.challenge_id,
      v.created_at,
      pp.full_name,
      pp.username,
      pp.age,
      pp.bio,
      pp.position as player_position,
      pp.preferred_foot,
      pp.height,
      pp.weight,
      pp.city,
      pp.country,
      pp.club,
      l.cnt,
      c.cnt,
      a.overall_score,
      comp.score
    from public.videos v
    inner join public.player_profiles pp on pp.id = v.user_id
    left join public.ai_analyses a on a.video_id = v.id
    cross join lateral (
      select count(*)::bigint as cnt
      from public.likes l2
      where l2.video_id = v.id
    ) l
    cross join lateral (
      select count(*)::bigint as cnt
      from public.comments c2
      where c2.video_id = v.id
    ) c
    cross join lateral (
      select (
        (case when coalesce(trim(pp.full_name), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.username), '') <> '' then 1 else 0 end) +
        (case when pp.age is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.bio), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.position), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.preferred_foot), '') <> '' then 1 else 0 end) +
        (case when pp.height is not null then 1 else 0 end) +
        (case when pp.weight is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.city), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.country), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.club), '') <> '' then 1 else 0 end)
      )::int as score
    ) comp
    where coalesce(
      nullif(trim(v.processed_video_url), ''),
      nullif(trim(v.video_url), ''),
      nullif(trim(v.source_video_url), '')
    ) is not null
      and ($1 is null or coalesce(trim(pp.position), '') ilike ('%%' || trim($1) || '%%'))
      and (
        $2 is null
        or lower(trim(coalesce(pp.country, v.country, ''))) = lower(trim($2))
      )
      and ($3 is null or pp.age is null or pp.age >= $3)
      and ($4 is null or pp.age is null or pp.age <= $4)
    order by %s
    limit $5 offset $6
    $q$,
    v_order
  )
  using
    nullif(trim(p_position), ''),
    nullif(trim(p_country), ''),
    p_age_min,
    p_age_max,
    v_lim,
    v_off;
end;
$$;

revoke all on function public.scout_discovery_feed(int, int, text, text, int, int, text) from public;
grant execute on function public.scout_discovery_feed(int, int, text, text, int, int, text) to authenticated;

comment on function public.scout_discovery_feed is
  'Talent discovery for approved scouts: ranked videos + profile stats. Sort: discovery | newest | most_liked | highest_ai. Includes processed_video_url/source_video_url for playback.';


-- ============================================================================
-- FILE: 20260426120000_player_profile_avatars.sql
-- ============================================================================
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


-- ============================================================================
-- FILE: 20260426173000_users_suspension_column_unify.sql
-- ============================================================================
-- Unify suspension state column to `public.users.is_suspended`.
-- Some environments may still carry legacy `public.users.suspended`.

do $$
begin
  -- If only legacy column exists, rename it to canonical column.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'suspended'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'is_suspended'
  ) then
    alter table public.users rename column suspended to is_suspended;
  end if;
end $$;

alter table public.users
  add column if not exists is_suspended boolean not null default false;

do $$
begin
  -- If both columns exist (drifted DB), migrate true values to canonical column.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'suspended'
  ) then
    execute $sql$
      update public.users
      set is_suspended = coalesce(is_suspended, false) or coalesce(suspended, false)
    $sql$;
  end if;
end $$;

alter table public.users
  alter column is_suspended set default false,
  alter column is_suspended set not null;

comment on column public.users.is_suspended is
  'Canonical suspension flag for user access control.';

-- Ensure admin RPC writes canonical column.
create or replace function public.goalnova_admin_set_suspended(
  p_user_id uuid,
  p_suspended boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
begin
  if actor_id is null then
    raise exception 'auth required';
  end if;

  select u.admin_role
  into actor_role
  from public.users u
  where u.id = actor_id;

  if actor_role not in ('super_admin', 'moderator') then
    raise exception 'insufficient privileges';
  end if;

  update public.users
  set is_suspended = p_suspended
  where id = p_user_id;

  if not found then
    raise exception 'user not found';
  end if;

  insert into public.admin_audit_log(admin_user_id, action, target_user_id, payload)
  values (
    actor_id,
    'set_suspended',
    p_user_id,
    jsonb_build_object('suspended', p_suspended)
  );
end;
$$;

revoke all on function public.goalnova_admin_set_suspended(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_suspended(uuid, boolean) to authenticated;


-- ============================================================================
-- FILE: 20260426194500_admin_user_detail_profile_source_fix.sql
-- ============================================================================
-- Ensure admin user detail returns effective player profile values
-- and metadata about the source table used.

create or replace function public.goalnova_admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user jsonb;
  v_player_raw jsonb;
  v_player jsonb;
  v_player_exists boolean := false;
  v_player_source text := 'none';
  v_scout jsonb;
  v_age numeric;
  v_height numeric;
  v_weight numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select to_jsonb(u.*)
  into v_user
  from public.users u
  where u.id = p_user_id;

  if v_user is null then
    return null;
  end if;

  if v_staff <> 'super_admin' and coalesce((v_user->>'is_deleted')::boolean, false) then
    raise exception 'Forbidden';
  end if;

  select to_jsonb(pp.*)
  into v_player_raw
  from public.player_profiles pp
  where pp.id = p_user_id;

  if v_player_raw is not null then
    v_player_exists := true;
    v_player_source := 'player_profiles';
  else
    v_player_source := 'users_fallback';
  end if;

  -- Build an effective player profile object:
  -- prefer player_profiles values; fallback to users JSON keys when available.
  v_age := nullif(coalesce(v_player_raw->>'age', v_user->>'age', ''), '')::numeric;
  v_height := nullif(coalesce(v_player_raw->>'height', v_user->>'height', ''), '')::numeric;
  v_weight := nullif(coalesce(v_player_raw->>'weight', v_user->>'weight', ''), '')::numeric;

  v_player := jsonb_build_object(
    'id', p_user_id,
    'full_name', nullif(coalesce(v_player_raw->>'full_name', v_user->>'full_name', ''), ''),
    'username', nullif(coalesce(v_player_raw->>'username', v_user->>'username', ''), ''),
    'bio', nullif(coalesce(v_player_raw->>'bio', v_user->>'bio', ''), ''),
    'city', nullif(coalesce(v_player_raw->>'city', v_user->>'city', ''), ''),
    'country', nullif(coalesce(v_player_raw->>'country', v_user->>'country', ''), ''),
    'position', nullif(coalesce(v_player_raw->>'position', v_user->>'position', ''), ''),
    'club', nullif(coalesce(v_player_raw->>'club', v_user->>'club', ''), ''),
    'preferred_foot', nullif(coalesce(v_player_raw->>'preferred_foot', v_user->>'preferred_foot', ''), ''),
    'age', v_age,
    'height', v_height,
    'weight', v_weight
  );

  select to_jsonb(sp.*)
  into v_scout
  from public.scout_profiles sp
  where sp.id = p_user_id;

  return jsonb_build_object(
    'user', v_user,
    'player_profile', v_player,
    'player_profile_exists', v_player_exists,
    'player_profile_source', v_player_source,
    'scout_profile', v_scout
  );
end;
$$;

revoke all on function public.goalnova_admin_get_user_detail(uuid) from public;
grant execute on function public.goalnova_admin_get_user_detail(uuid) to authenticated;


-- ============================================================================
-- FILE: 20260426200000_admin_set_deleted_log_and_return_row.sql
-- ============================================================================
-- Strengthen admin soft-delete RPC observability and payload.
-- Canonical column: public.users.is_deleted

create or replace function public.goalnova_admin_set_deleted(
  p_user_id uuid,
  p_deleted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_updated public.users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_deleted = p_deleted
  where id = p_user_id
  returning * into v_updated;

  if not found then
    raise exception 'User not found';
  end if;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_deleted',
    jsonb_build_object('deleted', p_deleted, 'column', 'is_deleted')
  );

  return jsonb_build_object(
    'ok', true,
    'column_used', 'is_deleted',
    'p_deleted', p_deleted,
    'updated_row', to_jsonb(v_updated)
  );
end;
$$;

revoke all on function public.goalnova_admin_set_deleted(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_deleted(uuid, boolean) to authenticated;


-- ============================================================================
-- FILE: 20260426213000_admin_user_notices.sql
-- ============================================================================
-- Admin user notices: send in-app notifications to a target user from staff tools.

create or replace function public.goalnova_admin_send_user_notice(
  p_user_id uuid,
  p_notice_type text,
  p_message text,
  p_locale text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_actor_id uuid := auth.uid();
  v_notice_type text := lower(trim(coalesce(p_notice_type, 'custom')));
  v_message text := trim(coalesce(p_message, ''));
  v_target_exists boolean := false;
  v_notification public.notifications%rowtype;
  v_direct_message public.messages%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  if v_notice_type not in (
    'warning',
    'guideline_violation',
    'profile_issue',
    'suspension_warning',
    'verification_issue',
    'custom'
  ) then
    raise exception 'Invalid notice type';
  end if;

  if char_length(v_message) = 0 then
    raise exception 'Message required';
  end if;

  select true
  into v_target_exists
  from public.users u
  where u.id = p_user_id
  limit 1;

  if not coalesce(v_target_exists, false) then
    raise exception 'User not found';
  end if;

  insert into public.notifications (
    user_id,
    type,
    message,
    related_user_id,
    is_read,
    created_at
  )
  values (
    p_user_id,
    'admin_notice',
    v_message,
    v_actor_id,
    false,
    now()
  )
  returning * into v_notification;

  -- Mirror admin notice into direct messages so user sees it immediately in inbox.
  insert into public.messages (
    sender_id,
    receiver_id,
    message
  )
  values (
    v_actor_id,
    p_user_id,
    v_message
  )
  returning * into v_direct_message;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'admin_notice_sent',
    jsonb_build_object(
      'notice_type', v_notice_type,
      'message', v_message,
      'locale', nullif(trim(coalesce(p_locale, '')), ''),
      'notification_id', v_notification.id,
      'message_id', v_direct_message.id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'notice_type', v_notice_type,
    'column_used', 'notifications.type=admin_notice',
    'notification', to_jsonb(v_notification),
    'direct_message', to_jsonb(v_direct_message)
  );
end;
$$;

revoke all on function public.goalnova_admin_send_user_notice(uuid, text, text, text) from public;
grant execute on function public.goalnova_admin_send_user_notice(uuid, text, text, text) to authenticated;


-- ============================================================================
-- FILE: 20260427120000_profile_avatars_users_bucket.sql
-- ============================================================================
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


-- ============================================================================
-- FILE: 20260427180000_challenges_rewards_winners_delete.sql
-- ============================================================================
-- Rich rewards, official winners, staff delete on challenges.

alter table public.challenges
  add column if not exists reward_title text,
  add column if not exists reward_detail text,
  add column if not exists reward_type text,
  add column if not exists reward_image_url text;

comment on column public.challenges.reward_title is 'Short prize headline for cards and hero UI.';
comment on column public.challenges.reward_detail is 'Longer prize copy; optional if legacy `reward` is used.';
comment on column public.challenges.reward_type is 'Prize category: gear | digital | cash | feature | recognition | other.';
comment on column public.challenges.reward_image_url is 'Optional image URL for reward visuals.';

alter table public.challenges
  drop constraint if exists challenges_reward_type_check;

alter table public.challenges
  add constraint challenges_reward_type_check check (
    reward_type is null
    or reward_type in ('gear', 'digital', 'cash', 'feature', 'recognition', 'other')
  );

update public.challenges
set reward_detail = reward
where coalesce(trim(reward_detail), '') = ''
  and reward is not null
  and trim(reward) <> '';

create table if not exists public.challenge_winners (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  rank int not null,
  placement_source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint challenge_winners_rank_range check (rank >= 1 and rank <= 10),
  constraint challenge_winners_source_check check (placement_source in ('manual', 'computed')),
  constraint challenge_winners_challenge_rank_unique unique (challenge_id, rank),
  constraint challenge_winners_challenge_video_unique unique (challenge_id, video_id)
);

create index if not exists challenge_winners_challenge_id_idx
  on public.challenge_winners (challenge_id);

comment on table public.challenge_winners is
  'Official podium for a challenge. Manual rows override client-side computed podium when present.';

alter table public.challenge_winners enable row level security;

drop policy if exists "challenge_winners_select" on public.challenge_winners;
create policy "challenge_winners_select"
  on public.challenge_winners
  for select
  to anon, authenticated
  using (
    public.goalnova_staff_effective_role() is not null
    or exists (
      select 1 from public.challenges c
      where c.id = challenge_winners.challenge_id
        and c.status = 'ended'
    )
  );

drop policy if exists "challenge_winners_insert_staff" on public.challenge_winners;
create policy "challenge_winners_insert_staff"
  on public.challenge_winners
  for insert
  to authenticated
  with check (public.goalnova_staff_effective_role() is not null);

drop policy if exists "challenge_winners_update_staff" on public.challenge_winners;
create policy "challenge_winners_update_staff"
  on public.challenge_winners
  for update
  to authenticated
  using (public.goalnova_staff_effective_role() is not null)
  with check (public.goalnova_staff_effective_role() is not null);

drop policy if exists "challenge_winners_delete_staff" on public.challenge_winners;
create policy "challenge_winners_delete_staff"
  on public.challenge_winners
  for delete
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

grant select on table public.challenge_winners to anon, authenticated;
grant insert, update, delete on table public.challenge_winners to authenticated;

drop policy if exists "challenges_delete_staff" on public.challenges;
create policy "challenges_delete_staff"
  on public.challenges
  for delete
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

grant delete on table public.challenges to authenticated;


-- ============================================================================
-- FILE: 20260428120000_challenges_canonical_reward_columns.sql
-- ============================================================================
-- Canonical reward copy column: `reward_detail` (app + database.types.ts).
-- Renames legacy `reward_description` → `reward_detail` if present; never query both names from clients.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenges' and column_name = 'reward_description'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenges' and column_name = 'reward_detail'
  ) then
    alter table public.challenges rename column reward_description to reward_detail;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenges' and column_name = 'reward_description'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenges' and column_name = 'reward_detail'
  ) then
    update public.challenges
    set reward_detail = coalesce(
      nullif(trim(reward_detail), ''),
      nullif(trim(reward_description), '')
    );
    alter table public.challenges drop column reward_description;
  end if;
end $$;

alter table public.challenges
  add column if not exists reward_title text,
  add column if not exists reward_detail text,
  add column if not exists reward_type text,
  add column if not exists reward_image_url text;

comment on column public.challenges.reward_detail is
  'Longer prize copy. Canonical name is reward_detail (not reward_description).';


-- ============================================================================
-- FILE: 20260429231000_support_ticket_messages_and_category.sql
-- ============================================================================
-- Support tickets: category + threaded messages + admin reply notification

alter table public.support_tickets
  add column if not exists category text not null default 'other'
    check (category in (
      'account_issue',
      'verification_issue',
      'payment_issue',
      'report_problem',
      'bug_report',
      'other'
    ));

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_user_id uuid references public.users (id) on delete set null,
  sender_admin_id uuid references public.users (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint support_ticket_messages_sender_check check (
    (sender_user_id is not null and sender_admin_id is null) or
    (sender_user_id is null and sender_admin_id is not null)
  )
);

create index if not exists support_ticket_messages_ticket_id_idx
  on public.support_ticket_messages (ticket_id, created_at asc);

alter table public.support_ticket_messages enable row level security;

drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own"
on public.support_tickets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
on public.support_tickets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "support_tickets_select_admin" on public.support_tickets;
create policy "support_tickets_select_admin"
on public.support_tickets
for select
to authenticated
using (public.goalnova_staff_effective_role() is not null);

drop policy if exists "support_tickets_update_admin" on public.support_tickets;
create policy "support_tickets_update_admin"
on public.support_tickets
for update
to authenticated
using (public.goalnova_staff_effective_role() is not null)
with check (public.goalnova_staff_effective_role() is not null);

drop policy if exists "support_ticket_messages_select_own" on public.support_ticket_messages;
create policy "support_ticket_messages_select_own"
on public.support_ticket_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "support_ticket_messages_insert_own" on public.support_ticket_messages;
create policy "support_ticket_messages_insert_own"
on public.support_ticket_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and sender_admin_id is null
  and exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "support_ticket_messages_select_admin" on public.support_ticket_messages;
create policy "support_ticket_messages_select_admin"
on public.support_ticket_messages
for select
to authenticated
using (public.goalnova_staff_effective_role() is not null);

drop policy if exists "support_ticket_messages_insert_admin" on public.support_ticket_messages;
create policy "support_ticket_messages_insert_admin"
on public.support_ticket_messages
for insert
to authenticated
with check (
  sender_admin_id = auth.uid()
  and sender_user_id is null
  and public.goalnova_staff_effective_role() is not null
);

create or replace function public.goalnova_create_support_ticket(
  p_subject text,
  p_message text,
  p_category text default 'other'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_uid := auth.uid();

  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  v_category := lower(trim(coalesce(p_category, 'other')));
  if v_category not in ('account_issue', 'verification_issue', 'payment_issue', 'report_problem', 'bug_report', 'other') then
    v_category := 'other';
  end if;

  insert into public.support_tickets (user_id, subject, message, category)
  values (v_uid, trim(p_subject), trim(p_message), v_category)
  returning id into v_id;

  insert into public.support_ticket_messages (ticket_id, sender_user_id, message)
  values (v_id, v_uid, trim(p_message));

  return v_id;
end;
$$;

revoke all on function public.goalnova_create_support_ticket(text, text, text) from public;
grant execute on function public.goalnova_create_support_ticket(text, text, text) to authenticated;

create or replace function public.goalnova_admin_create_support_ticket_for_user(
  p_user_id uuid,
  p_subject text,
  p_message text,
  p_assigned_admin_id uuid default null,
  p_category text default 'other'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_id uuid;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'moderator' then
    raise exception 'Forbidden';
  end if;

  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  if p_assigned_admin_id is not null and v_staff <> 'super_admin' and p_assigned_admin_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  v_category := lower(trim(coalesce(p_category, 'other')));
  if v_category not in ('account_issue', 'verification_issue', 'payment_issue', 'report_problem', 'bug_report', 'other') then
    v_category := 'other';
  end if;

  insert into public.support_tickets (user_id, subject, message, category, assigned_admin_id, status)
  values (p_user_id, trim(p_subject), trim(p_message), v_category, p_assigned_admin_id, 'open')
  returning id into v_id;

  insert into public.support_ticket_messages (ticket_id, sender_admin_id, message)
  values (v_id, auth.uid(), trim(p_message));

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'support_ticket_created_by_admin',
    jsonb_build_object('ticket_id', v_id, 'assigned_admin_id', p_assigned_admin_id)
  );

  return v_id;
end;
$$;

revoke all on function public.goalnova_admin_create_support_ticket_for_user(uuid, text, text, uuid, text) from public;
grant execute on function public.goalnova_admin_create_support_ticket_for_user(uuid, text, text, uuid, text) to authenticated;

create or replace function public.goalnova_admin_list_support_ticket_messages(
  p_ticket_id uuid
)
returns setof public.support_ticket_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  return query
  select m.*
  from public.support_ticket_messages m
  where m.ticket_id = p_ticket_id
  order by m.created_at asc;
end;
$$;

revoke all on function public.goalnova_admin_list_support_ticket_messages(uuid) from public;
grant execute on function public.goalnova_admin_list_support_ticket_messages(uuid) to authenticated;

create or replace function public.goalnova_admin_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user_id uuid;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  select t.user_id into v_user_id
  from public.support_tickets t
  where t.id = p_ticket_id;
  if v_user_id is null then
    raise exception 'Ticket not found';
  end if;

  insert into public.support_ticket_messages (ticket_id, sender_admin_id, message)
  values (p_ticket_id, auth.uid(), trim(p_message))
  returning id into v_message_id;

  update public.support_tickets t
  set
    status = case when t.status = 'closed' then 'in_progress' else t.status end,
    updated_at = now()
  where t.id = p_ticket_id;

  insert into public.notifications (user_id, type, message, related_user_id, is_read)
  values (
    v_user_id,
    'profile',
    'PitchRusch Support replied to your ticket',
    auth.uid(),
    false
  );

  perform public.goalnova_admin_audit_log(
    v_user_id,
    'support_ticket_reply',
    jsonb_build_object('ticket_id', p_ticket_id, 'message_id', v_message_id)
  );

  return v_message_id;
end;
$$;

revoke all on function public.goalnova_admin_reply_support_ticket(uuid, text) from public;
grant execute on function public.goalnova_admin_reply_support_ticket(uuid, text) to authenticated;



-- ============================================================================
-- FILE: 20260429234500_support_ticket_message_read_state.sql
-- ============================================================================
-- Track read state for support thread messages

alter table public.support_ticket_messages
  add column if not exists read_by_user_at timestamptz null,
  add column if not exists read_by_admin_at timestamptz null;

-- Initial backfill for historical rows
update public.support_ticket_messages
set
  read_by_user_at = case
    when sender_user_id is not null and read_by_user_at is null then created_at
    else read_by_user_at
  end,
  read_by_admin_at = case
    when sender_admin_id is not null and read_by_admin_at is null then created_at
    else read_by_admin_at
  end;

drop policy if exists "support_ticket_messages_update_own_read" on public.support_ticket_messages;
create policy "support_ticket_messages_update_own_read"
on public.support_ticket_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        t.user_id = auth.uid()
        or public.goalnova_staff_effective_role() is not null
      )
  )
)
with check (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        t.user_id = auth.uid()
        or public.goalnova_staff_effective_role() is not null
      )
  )
);

create or replace function public.goalnova_admin_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user_id uuid;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  select t.user_id into v_user_id
  from public.support_tickets t
  where t.id = p_ticket_id;
  if v_user_id is null then
    raise exception 'Ticket not found';
  end if;

  insert into public.support_ticket_messages (
    ticket_id,
    sender_admin_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (p_ticket_id, auth.uid(), trim(p_message), null, now())
  returning id into v_message_id;

  update public.support_tickets t
  set
    status = case when t.status = 'closed' then 'in_progress' else t.status end,
    updated_at = now()
  where t.id = p_ticket_id;

  insert into public.notifications (user_id, type, message, related_user_id, is_read)
  values (
    v_user_id,
    'profile',
    'PitchRusch Support replied to your ticket',
    auth.uid(),
    false
  );

  perform public.goalnova_admin_audit_log(
    v_user_id,
    'support_ticket_reply',
    jsonb_build_object('ticket_id', p_ticket_id, 'message_id', v_message_id)
  );

  return v_message_id;
end;
$$;

create or replace function public.goalnova_create_support_ticket(
  p_subject text,
  p_message text,
  p_category text default 'other'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_uid := auth.uid();

  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  v_category := lower(trim(coalesce(p_category, 'other')));
  if v_category not in ('account_issue', 'verification_issue', 'payment_issue', 'report_problem', 'bug_report', 'other') then
    v_category := 'other';
  end if;

  insert into public.support_tickets (user_id, subject, message, category)
  values (v_uid, trim(p_subject), trim(p_message), v_category)
  returning id into v_id;

  insert into public.support_ticket_messages (
    ticket_id,
    sender_user_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (v_id, v_uid, trim(p_message), now(), null);

  return v_id;
end;
$$;

create or replace function public.goalnova_admin_create_support_ticket_for_user(
  p_user_id uuid,
  p_subject text,
  p_message text,
  p_assigned_admin_id uuid default null,
  p_category text default 'other'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_id uuid;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'moderator' then
    raise exception 'Forbidden';
  end if;

  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  if p_assigned_admin_id is not null and v_staff <> 'super_admin' and p_assigned_admin_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  v_category := lower(trim(coalesce(p_category, 'other')));
  if v_category not in ('account_issue', 'verification_issue', 'payment_issue', 'report_problem', 'bug_report', 'other') then
    v_category := 'other';
  end if;

  insert into public.support_tickets (user_id, subject, message, category, assigned_admin_id, status)
  values (p_user_id, trim(p_subject), trim(p_message), v_category, p_assigned_admin_id, 'open')
  returning id into v_id;

  insert into public.support_ticket_messages (
    ticket_id,
    sender_admin_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (v_id, auth.uid(), trim(p_message), null, now());

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'support_ticket_created_by_admin',
    jsonb_build_object('ticket_id', v_id, 'assigned_admin_id', p_assigned_admin_id)
  );

  return v_id;
end;
$$;



-- ============================================================================
-- FILE: 20260430061500_support_ticket_admin_notifications.sql
-- ============================================================================
-- Notify admin staff when users create/reply in support tickets.

create or replace function public.goalnova_notify_admins_support_ticket_user_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
begin
  -- Only user-authored messages should notify admins.
  if new.sender_user_id is null then
    return new;
  end if;

  select *
  into v_ticket
  from public.support_tickets
  where id = new.ticket_id;

  if v_ticket.id is null then
    return new;
  end if;

  -- Prefer assigned admin when present.
  if v_ticket.assigned_admin_id is not null then
    insert into public.notifications (user_id, type, message, related_user_id, is_read)
    values (
      v_ticket.assigned_admin_id,
      'profile',
      format('New support ticket message: %s', coalesce(v_ticket.subject, 'Support ticket')),
      new.sender_user_id,
      false
    );
    return new;
  end if;

  -- Otherwise notify all support-capable staff.
  insert into public.notifications (user_id, type, message, related_user_id, is_read)
  select
    u.id,
    'profile',
    format('New support ticket: %s', coalesce(v_ticket.subject, 'Support ticket')),
    new.sender_user_id,
    false
  from public.users u
  where (
    u.admin_role in ('super_admin', 'support_admin')
    or (coalesce(u.is_admin, false) = true and u.admin_role is null)
  );

  return new;
end;
$$;

drop trigger if exists trg_support_ticket_admin_notify_on_user_message on public.support_ticket_messages;
create trigger trg_support_ticket_admin_notify_on_user_message
after insert on public.support_ticket_messages
for each row
execute function public.goalnova_notify_admins_support_ticket_user_message();



-- ============================================================================
-- FILE: 20260430062400_support_ticket_user_notifications.sql
-- ============================================================================
-- Notify ticket owner when support/admin sends a ticket message.

create or replace function public.goalnova_notify_user_support_ticket_admin_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_message text;
begin
  -- Only admin/support-authored messages should notify ticket owner.
  if new.sender_admin_id is null then
    return new;
  end if;

  select *
  into v_ticket
  from public.support_tickets
  where id = new.ticket_id;

  if v_ticket.id is null or v_ticket.user_id is null then
    return new;
  end if;

  v_message := 'PitchRusch Support replied to your ticket';

  -- Avoid accidental duplicates from mixed RPC + trigger paths.
  if exists (
    select 1
    from public.notifications n
    where n.user_id = v_ticket.user_id
      and n.type = 'profile'
      and n.message = v_message
      and n.related_user_id = new.sender_admin_id
      and n.created_at > now() - interval '30 seconds'
  ) then
    return new;
  end if;

  insert into public.notifications (user_id, type, message, related_user_id, is_read)
  values (v_ticket.user_id, 'profile', v_message, new.sender_admin_id, false);

  return new;
end;
$$;

drop trigger if exists trg_support_ticket_notify_user_on_admin_message on public.support_ticket_messages;
create trigger trg_support_ticket_notify_user_on_admin_message
after insert on public.support_ticket_messages
for each row
execute function public.goalnova_notify_user_support_ticket_admin_message();



-- ============================================================================
-- FILE: 20260430071500_support_ticket_user_reply_rpc.sql
-- ============================================================================
-- User reply RPC to avoid client-side RLS insert failures.

create or replace function public.goalnova_user_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_ticket public.support_tickets%rowtype;
  v_message_id uuid;
  v_body text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_ticket
  from public.support_tickets
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Ticket not found';
  end if;

  if v_ticket.user_id is distinct from v_uid then
    raise exception 'Forbidden';
  end if;

  v_body := trim(coalesce(p_message, ''));
  if length(v_body) < 2 then
    raise exception 'Invalid message';
  end if;

  insert into public.support_ticket_messages (
    ticket_id,
    sender_user_id,
    sender_admin_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (
    p_ticket_id,
    v_uid,
    null,
    v_body,
    now(),
    null
  )
  returning id into v_message_id;

  update public.support_tickets t
  set updated_at = now()
  where t.id = p_ticket_id;

  return v_message_id;
end;
$$;

revoke all on function public.goalnova_user_reply_support_ticket(uuid, text) from public;
grant execute on function public.goalnova_user_reply_support_ticket(uuid, text) to authenticated;


-- ============================================================================
-- FILE: 20260430095000_support_ticket_reply_notification_single_source.sql
-- ============================================================================
-- Avoid duplicate user notifications on admin support reply.
-- Single source of truth: trigger `trg_support_ticket_notify_user_on_admin_message`.

create or replace function public.goalnova_admin_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user_id uuid;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  select t.user_id into v_user_id
  from public.support_tickets t
  where t.id = p_ticket_id;
  if v_user_id is null then
    raise exception 'Ticket not found';
  end if;

  insert into public.support_ticket_messages (
    ticket_id,
    sender_admin_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (p_ticket_id, auth.uid(), trim(p_message), null, now())
  returning id into v_message_id;

  update public.support_tickets t
  set
    status = case when t.status = 'closed' then 'in_progress' else t.status end,
    updated_at = now()
  where t.id = p_ticket_id;

  -- IMPORTANT: notification insert removed from RPC.
  -- Trigger `trg_support_ticket_notify_user_on_admin_message`
  -- is responsible for inserting one deduplicated notification.

  perform public.goalnova_admin_audit_log(
    v_user_id,
    'support_ticket_reply',
    jsonb_build_object('ticket_id', p_ticket_id, 'message_id', v_message_id)
  );

  return v_message_id;
end;
$$;


-- ============================================================================
-- FILE: 20260430104500_admin_delete_support_ticket_message.sql
-- ============================================================================
-- Allow staff to delete support ticket messages from admin support UI.

create or replace function public.goalnova_admin_delete_support_ticket_message(
  p_message_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_ticket_id uuid;
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select m.ticket_id
  into v_ticket_id
  from public.support_ticket_messages m
  where m.id = p_message_id;

  if v_ticket_id is null then
    raise exception 'Message not found';
  end if;

  select t.user_id
  into v_owner_id
  from public.support_tickets t
  where t.id = v_ticket_id;

  delete from public.support_ticket_messages
  where id = p_message_id;

  perform public.goalnova_admin_audit_log(
    v_owner_id,
    'support_ticket_message_deleted',
    jsonb_build_object('ticket_id', v_ticket_id, 'message_id', p_message_id)
  );

  return true;
end;
$$;

revoke all on function public.goalnova_admin_delete_support_ticket_message(uuid) from public;
grant execute on function public.goalnova_admin_delete_support_ticket_message(uuid) to authenticated;


-- ============================================================================
-- FILE: 20260430120000_ai_analyses_football_validity.sql
-- ============================================================================
-- Football validity gate: reject non-football clips before metric scoring.
-- visibility_analysis remains jsonb for valid analyses; null when invalid.

alter table public.ai_analyses
  add column if not exists valid_for_football_analysis boolean not null default true;

alter table public.ai_analyses
  add column if not exists clip_type text;

alter table public.ai_analyses
  add column if not exists invalid_reason text;

comment on column public.ai_analyses.valid_for_football_analysis is
  'When false, the clip was not suitable for football scoring (e.g. non-football or insufficient evidence).';

comment on column public.ai_analyses.clip_type is
  'High-level classification: training | match | skill | non_football | unclear | other (provider-defined).';

comment on column public.ai_analyses.invalid_reason is
  'Human-readable reason when valid_for_football_analysis is false.';


-- ============================================================================
-- FILE: 20260430131000_goalnova_delete_notification_for_me.sql
-- ============================================================================
-- Reliable per-user notification delete from the app (avoids client DELETE + RETURNING
-- sometimes reporting zero rows under RLS while the row is visible via SELECT).

create or replace function public.goalnova_delete_notification_for_me(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  uid uuid;
begin
  uid := (select auth.uid());

  if uid is null then
    begin
      uid := (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
    exception
      when others then
        uid := null;
    end;
  end if;

  if uid is null then
    return false;
  end if;

  delete from public.notifications n
  where n.id = p_notification_id
    and n.user_id = uid;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.goalnova_delete_notification_for_me(uuid) from public;
grant execute on function public.goalnova_delete_notification_for_me(uuid) to authenticated;


-- ============================================================================
-- FILE: 20260430131500_goalnova_delete_notification_auth_fallback.sql
-- ============================================================================
-- Harden notification delete RPC: resolve recipient id when auth.uid() is null inside
-- SECURITY DEFINER (PostgREST still passes JWT; sub fallback matches hide-message patterns).

create or replace function public.goalnova_delete_notification_for_me(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  uid uuid;
begin
  uid := (select auth.uid());

  if uid is null then
    begin
      uid := (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
    exception
      when others then
        uid := null;
    end;
  end if;

  if uid is null then
    return false;
  end if;

  delete from public.notifications n
  where n.id = p_notification_id
    and n.user_id = uid;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.goalnova_delete_notification_for_me(uuid) from public;
grant execute on function public.goalnova_delete_notification_for_me(uuid) to authenticated;


-- ============================================================================
-- FILE: 20260430140000_goalnova_hide_message_auth_uid.sql
-- ============================================================================
-- Fix soft-hide RPC when auth.uid() is null inside SECURITY DEFINER (same pattern as notifications delete).

create or replace function public.goalnova_hide_message_for_me(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  uid uuid;
begin
  uid := (select auth.uid());

  if uid is null then
    begin
      uid := (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
    exception
      when others then
        uid := null;
    end;
  end if;

  if uid is null then
    return false;
  end if;

  update public.messages m
  set
    deleted_for_sender = case
      when m.sender_id = uid then true
      else m.deleted_for_sender
    end,
    deleted_for_recipient = case
      when m.receiver_id = uid then true
      else m.deleted_for_recipient
    end
  where m.id = p_message_id
    and (m.sender_id = uid or m.receiver_id = uid);

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.goalnova_hide_message_for_me(uuid) from public;
grant execute on function public.goalnova_hide_message_for_me(uuid) to authenticated;


-- ============================================================================
-- FILE: 20260430140500_messages_soft_delete_columns_ensure.sql
-- ============================================================================
-- Ensure per-user soft delete columns exist (idempotent for DBs that skipped earlier migrations).

alter table public.messages
  add column if not exists deleted_for_sender boolean not null default false,
  add column if not exists deleted_for_recipient boolean not null default false;


-- ============================================================================
-- FILE: 20260430143000_messages_soft_delete_update_policy.sql
-- ============================================================================
-- Allow authenticated DM participants to soft-delete from their own side via UPDATE.
-- Needed for client-side:
--   update messages set deleted_for_sender/deleted_for_recipient ...

drop policy if exists "messages_update_participants_soft_delete" on public.messages;

create policy "messages_update_participants_soft_delete"
  on public.messages
  for update
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);

grant update on table public.messages to authenticated;


-- ============================================================================
-- FILE: 20260430143000_videos_select_public_playback_urls.sql
-- ============================================================================
-- Public feed/explore should allow any playable video URL variant.
-- Previous policy required only `video_url`, which hides rows that use
-- `processed_video_url` or `source_video_url` as canonical playback URL.

drop policy if exists "videos_select_explore_public" on public.videos;
create policy "videos_select_explore_public"
  on public.videos
  for select
  to anon, authenticated
  using (
    (
      video_url is not null
      and length(trim(video_url)) > 0
    )
    or (
      processed_video_url is not null
      and length(trim(processed_video_url)) > 0
    )
    or (
      source_video_url is not null
      and length(trim(source_video_url)) > 0
    )
  );

grant select on table public.videos to anon;


-- ============================================================================
-- FILE: 20260430160000_messages_insert_rls_repair.sql
-- ============================================================================
-- Repair INSERT on public.messages (PostgREST 42501: new row violates row-level security policy).
-- Some projects had the insert policy dropped, renamed, or a conflicting restrictive policy added in the dashboard.

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.messages', r.policyname);
  end loop;
end $$;

create policy "messages_insert_as_sender"
  on public.messages
  as permissive
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
  );

grant insert on table public.messages to authenticated;


-- ============================================================================
-- FILE: 20260504120000_pitchrusch_storage_buckets.sql
-- ============================================================================
-- Rename Storage buckets goalnova-* → pitchrusch-* (objects + public URLs).
-- Safe to re-run: updates are conditional; buckets dropped only after object moves.

-- ---------------------------------------------------------------------------
-- Music catalog bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pitchrusch-music', 'pitchrusch-music', true)
on conflict (id) do update set public = excluded.public;

update storage.objects
set bucket_id = 'pitchrusch-music'
where bucket_id = 'goalnova-music';

drop policy if exists "goalnova_music_public_read" on storage.objects;
drop policy if exists "pitchrusch_music_public_read" on storage.objects;

create policy "pitchrusch_music_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'pitchrusch-music');

delete from storage.buckets where id = 'goalnova-music';

update public.music_tracks
set audio_url = replace(audio_url, 'goalnova-music', 'pitchrusch-music')
where audio_url is not null
  and audio_url like '%goalnova-music%';

-- ---------------------------------------------------------------------------
-- User videos bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pitchrusch-videos', 'pitchrusch-videos', true)
on conflict (id) do update set public = excluded.public;

update storage.objects
set bucket_id = 'pitchrusch-videos'
where bucket_id = 'goalnova-videos';

-- RLS for new bucket (public read + owner-only writes under `{uid}/…`).
alter table if exists storage.objects enable row level security;

drop policy if exists "pitchrusch_videos_public_read" on storage.objects;
create policy "pitchrusch_videos_public_read"
  on storage.objects
  for select
  using (bucket_id = 'pitchrusch-videos');

drop policy if exists "pitchrusch_videos_insert_own" on storage.objects;
create policy "pitchrusch_videos_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "pitchrusch_videos_update_own" on storage.objects;
create policy "pitchrusch_videos_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "pitchrusch_videos_delete_own" on storage.objects;
create policy "pitchrusch_videos_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pitchrusch-videos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

delete from storage.buckets where id = 'goalnova-videos';

update public.videos
set video_url = replace(video_url, 'goalnova-videos', 'pitchrusch-videos')
where video_url is not null
  and video_url like '%goalnova-videos%';

update public.videos
set processed_video_url = replace(processed_video_url, 'goalnova-videos', 'pitchrusch-videos')
where processed_video_url is not null
  and processed_video_url like '%goalnova-videos%';

update public.videos
set source_video_url = replace(source_video_url, 'goalnova-videos', 'pitchrusch-videos')
where source_video_url is not null
  and source_video_url like '%goalnova-videos%';


-- ============================================================================
-- FILE: 20260504180000_block_scout_video_upload_rls.sql
-- ============================================================================
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


-- ============================================================================
-- FILE: 20260505103000_scout_apply_notify_staff.sql
-- ============================================================================
-- When a scout submits (or resubmits after rejection) a verification application, notify staff inbox.
-- Matches support-ticket broadcast: super_admin, support_admin, legacy is_admin rows.
-- Failures inside the notify block must not roll back the application upsert.

create or replace function public.goalnova_notify_staff_scout_verification_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'pending' then
    return new;
  end if;

  -- Already pending → skip (e.g. resubmit while status unchanged avoids duplicate pings).
  if tg_op = 'UPDATE' and old.status is not distinct from 'pending'::text then
    return new;
  end if;

  begin
    insert into public.notifications (user_id, type, message, related_user_id, is_read)
    select
      u.id,
      'scout_verification',
      '__gn:scout_admin_review_pending__'::text,
      new.user_id,
      false
    from public.users u
    where (
      u.admin_role in ('super_admin', 'support_admin')
      or (coalesce(u.is_admin, false) = true and u.admin_role is null)
    )
      and coalesce(u.is_deleted, false) = false;
  exception
    when others then
      raise warning 'goalnova_notify_staff_scout_verification_pending insert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists trg_scout_verification_applications_staff_pending_notify
  on public.scout_verification_applications;

create trigger trg_scout_verification_applications_staff_pending_notify
after insert or update on public.scout_verification_applications
for each row
execute function public.goalnova_notify_staff_scout_verification_pending();


-- ============================================================================
-- FILE: 20260506052000_scout_discovery_feed_city_filter.sql
-- ============================================================================
-- Add city filter to scout discovery feed RPC.
-- Matches `profile city` first, with fallback to `video city` (contains / partial match).

create or replace function public.scout_discovery_feed(
  p_limit int default 20,
  p_offset int default 0,
  p_position text default null,
  p_country text default null,
  p_city text default null,
  p_age_min int default null,
  p_age_max int default null,
  p_sort text default 'discovery'
)
returns table (
  video_id uuid,
  user_id uuid,
  video_url text,
  processed_video_url text,
  source_video_url text,
  caption text,
  skill_type text,
  video_city text,
  video_country text,
  challenge_id uuid,
  video_created_at timestamptz,
  full_name text,
  username text,
  age int,
  bio text,
  player_position text,
  preferred_foot text,
  height int,
  weight int,
  profile_city text,
  profile_country text,
  club text,
  likes_count bigint,
  comments_count bigint,
  ai_overall_score numeric,
  profile_completeness int
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_ok boolean;
  v_order text;
  v_sort text;
  v_lim int := greatest(1, least(coalesce(p_limit, 20), 50));
  v_off int := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select
    (u.role = 'scout' and u.scout_verification_status = 'approved')
  into v_ok
  from public.users u
  where u.id = auth.uid();

  if not coalesce(v_ok, false) then
    raise exception 'not_verified_scout' using errcode = '42501';
  end if;

  v_sort := coalesce(nullif(trim(p_sort), ''), 'discovery');
  if v_sort not in ('discovery', 'newest', 'most_liked', 'highest_ai') then
    v_sort := 'discovery';
  end if;

  v_order := case v_sort
    when 'discovery' then
      'a.overall_score DESC NULLS LAST, l.cnt DESC, c.cnt DESC, comp.score DESC, v.created_at DESC'
    when 'newest' then
      'v.created_at DESC'
    when 'most_liked' then
      'l.cnt DESC, v.created_at DESC'
    when 'highest_ai' then
      'a.overall_score DESC NULLS LAST, v.created_at DESC'
    else
      'v.created_at DESC'
  end;

  return query execute format(
    $q$
    select
      v.id,
      v.user_id,
      v.video_url,
      v.processed_video_url,
      v.source_video_url,
      v.caption,
      v.skill_type,
      v.city,
      v.country,
      v.challenge_id,
      v.created_at,
      pp.full_name,
      pp.username,
      pp.age,
      pp.bio,
      pp.position as player_position,
      pp.preferred_foot,
      pp.height,
      pp.weight,
      pp.city,
      pp.country,
      pp.club,
      l.cnt,
      c.cnt,
      a.overall_score,
      comp.score
    from public.videos v
    inner join public.player_profiles pp on pp.id = v.user_id
    left join public.ai_analyses a on a.video_id = v.id
    cross join lateral (
      select count(*)::bigint as cnt
      from public.likes l2
      where l2.video_id = v.id
    ) l
    cross join lateral (
      select count(*)::bigint as cnt
      from public.comments c2
      where c2.video_id = v.id
    ) c
    cross join lateral (
      select (
        (case when coalesce(trim(pp.full_name), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.username), '') <> '' then 1 else 0 end) +
        (case when pp.age is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.bio), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.position), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.preferred_foot), '') <> '' then 1 else 0 end) +
        (case when pp.height is not null then 1 else 0 end) +
        (case when pp.weight is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.city), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.country), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.club), '') <> '' then 1 else 0 end)
      )::int as score
    ) comp
    where coalesce(
      nullif(trim(v.processed_video_url), ''),
      nullif(trim(v.video_url), ''),
      nullif(trim(v.source_video_url), '')
    ) is not null
      and ($1 is null or coalesce(trim(pp.position), '') ilike ('%%' || trim($1) || '%%'))
      and (
        $2 is null
        or lower(trim(coalesce(pp.country, v.country, ''))) = lower(trim($2))
      )
      and (
        $3 is null
        or translate(lower(trim(coalesce(pp.city, v.city, ''))), 'čćšđž', 'ccsdz')
           like ('%%' || translate(lower(trim($3)), 'čćšđž', 'ccsdz') || '%%')
      )
      and ($4 is null or pp.age is null or pp.age >= $4)
      and ($5 is null or pp.age is null or pp.age <= $5)
    order by %s
    limit $6 offset $7
    $q$,
    v_order
  )
  using
    nullif(trim(p_position), ''),
    nullif(trim(p_country), ''),
    nullif(trim(p_city), ''),
    p_age_min,
    p_age_max,
    v_lim,
    v_off;
end;
$$;

revoke all on function public.scout_discovery_feed(int, int, text, text, text, int, int, text) from public;
grant execute on function public.scout_discovery_feed(int, int, text, text, text, int, int, text) to authenticated;

comment on function public.scout_discovery_feed is
  'Talent discovery for approved scouts: ranked videos + profile stats. Sort: discovery | newest | most_liked | highest_ai. Includes optional city filter and processed/source playback URLs.';


-- ============================================================================
-- FILE: 20260506120000_scout_profiles_bio.sql
-- ============================================================================
-- Align DB with app types: scout profile editor saves `bio`.
alter table public.scout_profiles
  add column if not exists bio text;

comment on column public.scout_profiles.bio is
  'Optional scout biography shown on profile / settings.';


-- ============================================================================
-- FILE: 20260506194000_player_premium_system.sql
-- ============================================================================
-- Player Premium system (idempotent, safe re-run)

alter table public.player_profiles
add column if not exists subscription_plan text default 'free';

alter table public.player_profiles
add column if not exists subscription_status text default 'inactive';

alter table public.player_profiles
add column if not exists subscription_current_period_end timestamptz null;

alter table public.player_profiles
add column if not exists is_available_for_trials boolean default false;

alter table public.player_profiles
add column if not exists is_looking_for_club boolean default false;

alter table public.player_profiles
add column if not exists achievements text[] default '{}'::text[];

alter table public.player_profiles
add column if not exists career_history jsonb default '[]'::jsonb;

alter table public.player_profiles
add column if not exists profile_highlight text null;

alter table public.player_profiles
add column if not exists profile_completeness numeric null;

alter table public.player_profiles
add column if not exists ai_overall_score numeric null;

alter table public.videos
add column if not exists is_featured boolean default false;

alter table public.videos
add column if not exists views_count bigint default 0;

alter table public.videos
add column if not exists visibility_boost int default 0;

create table if not exists public.player_usage_limits (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  videos_uploaded int not null default 0,
  month text not null,
  created_at timestamptz not null default now(),
  unique (player_id, month)
);

create table if not exists public.player_profile_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  profile_views bigint not null default 0,
  video_views bigint not null default 0,
  scout_saves bigint not null default 0,
  scout_contacts bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (player_id)
);

create or replace view public.scout_video_feed as
select
  v.*,
  p.full_name,
  p.username,
  p.city as profile_city,
  p.country as profile_country,
  p.position as profile_position,
  p.subscription_plan,
  p.subscription_status,
  p.ai_overall_score,
  p.profile_completeness,
  case
    when p.subscription_plan = 'player_premium'
      and p.subscription_status = 'active'
    then 1 else 0
  end as premium_boost
from public.videos v
join public.player_profiles p on p.id = v.user_id;

drop policy if exists "videos_select_public" on public.videos;
create policy "videos_select_public"
on public.videos
for select
using (true);

drop policy if exists "videos_update_own_featured" on public.videos;
create policy "videos_update_own_featured"
on public.videos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================================
-- FILE: 20260506222000_add_sprint_20m_challenge.sql
-- ============================================================================
insert into public.challenges (
  slug,
  title,
  description,
  instructions,
  max_video_duration_seconds,
  equipment,
  rules_json,
  scoring,
  badge,
  rules,
  reward,
  reward_title,
  reward_detail,
  reward_type,
  status
)
values (
  'sprint-20m-challenge',
  'Sprint 20m Challenge',
  'Show your speed, explosiveness, and sprint technique by running 20 meters as fast as possible.',
  'Mark a 20-meter distance with a start and finish line. Start behind the line and sprint to the finish as fast as possible. Record the full attempt from start to finish.',
  15,
  '["2 cones","phone camera","stopwatch","20 meter space"]'::jsonb,
  '["The player must start behind the start line","The sprint distance must be exactly 20 meters","The full attempt must be visible in the video","Time is measured from the first movement to crossing the finish line","Flying start is not allowed","Edited or cut videos are not allowed","Maximum video length is 15 seconds"]'::jsonb,
  '{"sprint_time":60,"start_explosiveness":20,"running_technique":10,"execution_validity":10}'::jsonb,
  'Speedster',
  'Instructions:
- Mark a 20-meter distance with a start and finish line.
- Start behind the line and sprint to the finish as fast as possible.
- Record the full attempt from start to finish.

Equipment:
- 2 cones
- phone camera
- stopwatch
- 20 meter space

Rules:
- The player must start behind the start line.
- The sprint distance must be exactly 20 meters.
- The full attempt must be visible in the video.
- Time is measured from the first movement to crossing the finish line.
- Flying start is not allowed.
- Edited or cut videos are not allowed.
- Maximum video length is 15 seconds.

Scoring:
- Sprint time: 60
- Start explosiveness: 20
- Running technique: 10
- Execution validity: 10

Attempts:
- Free player: 1 attempt
- Premium player: multiple attempts, can choose best attempt, better visibility to scouts',
  'Speedster badge',
  'Speedster',
  'Badge for top Sprint 20m performers',
  'recognition',
  'active'
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  instructions = excluded.instructions,
  max_video_duration_seconds = excluded.max_video_duration_seconds,
  equipment = excluded.equipment,
  rules_json = excluded.rules_json,
  scoring = excluded.scoring,
  badge = excluded.badge,
  rules = excluded.rules,
  reward = excluded.reward,
  reward_title = excluded.reward_title,
  reward_detail = excluded.reward_detail,
  reward_type = excluded.reward_type,
  status = excluded.status;



-- ============================================================================
-- FILE: 20260507054500_challenges_structured_fields.sql
-- ============================================================================
alter table public.challenges
  add column if not exists instructions text,
  add column if not exists max_video_duration_seconds integer,
  add column if not exists equipment jsonb,
  add column if not exists rules_json jsonb,
  add column if not exists scoring jsonb,
  add column if not exists badge text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'challenges_max_video_duration_positive'
      and conrelid = 'public.challenges'::regclass
  ) then
    alter table public.challenges
      add constraint challenges_max_video_duration_positive
      check (max_video_duration_seconds is null or max_video_duration_seconds > 0);
  end if;
end $$;



-- ============================================================================
-- FILE: 20260507062000_challenges_translations_json.sql
-- ============================================================================
alter table public.challenges
  add column if not exists translations jsonb;



-- ============================================================================
-- FILE: 20260507100000_messages_insert_rls_ensure.sql
-- ============================================================================
-- Ensure DM INSERT works: auth.uid() must equal sender_id (see lib/supabase/messages.ts).
-- Fixes PostgREST 42501 when insert policies were dropped or edited in Dashboard.

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.messages', r.policyname);
  end loop;
end $$;

create policy "messages_insert_as_sender"
  on public.messages
  as permissive
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
  );

grant insert on table public.messages to authenticated;


-- ============================================================================
-- FILE: 20260507122500_stripe_subscriptions.sql
-- ============================================================================
-- Stripe subscriptions: storage fields + write protection (idempotent)

alter table public.users
add column if not exists stripe_customer_id text null;

alter table public.users
add column if not exists stripe_subscription_id text null;

alter table public.users
add column if not exists subscription_plan text default 'free';

alter table public.users
add column if not exists subscription_status text default 'inactive';

alter table public.users
add column if not exists subscription_current_period_end timestamptz null;

alter table public.player_profiles
add column if not exists stripe_customer_id text null;

alter table public.player_profiles
add column if not exists stripe_subscription_id text null;

alter table public.scout_profiles
add column if not exists stripe_customer_id text null;

alter table public.scout_profiles
add column if not exists stripe_subscription_id text null;

alter table public.scout_profiles
add column if not exists subscription_plan text default 'free';

alter table public.scout_profiles
add column if not exists subscription_status text default 'inactive';

alter table public.scout_profiles
add column if not exists subscription_current_period_end timestamptz null;

create index if not exists users_stripe_customer_id_idx on public.users (stripe_customer_id);
create index if not exists users_subscription_plan_status_idx on public.users (subscription_plan, subscription_status);

create or replace function public.goalnova_guard_subscription_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if coalesce(new.subscription_plan, '') is distinct from coalesce(old.subscription_plan, '')
     or coalesce(new.subscription_status, '') is distinct from coalesce(old.subscription_status, '')
     or coalesce(new.subscription_current_period_end::text, '') is distinct from coalesce(old.subscription_current_period_end::text, '')
     or coalesce(new.stripe_customer_id, '') is distinct from coalesce(old.stripe_customer_id, '')
     or coalesce(new.stripe_subscription_id, '') is distinct from coalesce(old.stripe_subscription_id, '') then
    raise exception 'subscription fields are managed by billing webhooks only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_subscription_fields_users on public.users;
create trigger trg_guard_subscription_fields_users
before update on public.users
for each row
execute function public.goalnova_guard_subscription_fields();

drop trigger if exists trg_guard_subscription_fields_player_profiles on public.player_profiles;
create trigger trg_guard_subscription_fields_player_profiles
before update on public.player_profiles
for each row
execute function public.goalnova_guard_subscription_fields();

drop trigger if exists trg_guard_subscription_fields_scout_profiles on public.scout_profiles;
create trigger trg_guard_subscription_fields_scout_profiles
before update on public.scout_profiles
for each row
execute function public.goalnova_guard_subscription_fields();

-- AI analyses legacy English text backfill to user locale (idempotent)
create or replace function public.goalnova_ai_locale_bucket(raw text)
returns text
language sql
immutable
as $$
  select case lower(split_part(coalesce(raw, 'en'), '-', 1))
    when 'hr' then 'hr'
    when 'de' then 'de'
    when 'bs' then 'bs'
    when 'es' then 'es'
    when 'pt' then 'pt'
    when 'sr' then 'sr'
    when 'fr' then 'fr'
    when 'it' then 'it'
    when 'nl' then 'nl'
    when 'tr' then 'tr'
    when 'ar' then 'ar'
    else 'en'
  end;
$$;

create or replace function public.goalnova_ai_is_legacy_english(raw text)
returns boolean
language sql
immutable
as $$
  select coalesce(raw, '') ~* '\m(the|clip|visible|ball|camera|score|only|not|no|appears|shown)\M';
$$;

create or replace function public.goalnova_ai_copy(locale_key text, copy_key text)
returns text
language sql
immutable
as $$
  select case copy_key
    when 'clip_summary' then
      case locale_key
        when 'hr' then 'Nogometne akcije su vidljive i ocijenjene samo gdje postoji jasan dokaz.'
        when 'de' then 'Fussballaktionen sind sichtbar und wurden nur bei klarer Evidenz bewertet.'
        when 'bs' then 'Nogometne akcije su vidljive i ocijenjene samo kada postoji jasan dokaz.'
        when 'es' then 'Las acciones de futbol son visibles y se evaluaron solo donde la evidencia es clara.'
        when 'pt' then 'As acoes de futebol estao visiveis e foram avaliadas apenas quando ha evidencia clara.'
        when 'sr' then 'Fudbalske akcije su vidljive i ocenjene samo gde postoji jasan dokaz.'
        when 'fr' then 'Les actions de football sont visibles et evaluees uniquement quand la preuve est claire.'
        when 'it' then 'Le azioni calcistiche sono visibili e valutate solo dove l evidenza e chiara.'
        when 'nl' then 'Voetbalacties zijn zichtbaar en alleen beoordeeld waar het bewijs duidelijk is.'
        when 'tr' then 'Klipte futbol aksiyonlari goruluyor ve sadece acik kanit olan kisimlar degerlendirildi.'
        when 'ar' then 'تظهر لقطات كرة قدم في هذا المقطع وتم تقييم ما لديه دليل واضح فقط.'
        else 'Football actions are visible and assessed only where evidence is clear.'
      end
    when 'camera_note' then
      case locale_key
        when 'hr' then 'Kvaliteta i kut kamere utjecu na pouzdanost; nejasni dijelovi se ne ocjenjuju.'
        when 'de' then 'Kameraqualitaet und Perspektive beeinflussen die Sicherheit; unklare Momente werden nicht bewertet.'
        when 'bs' then 'Kvalitet i ugao kamere uticu na pouzdanost; nejasni dijelovi se ne ocjenjuju.'
        when 'es' then 'La calidad y el angulo de camara afectan la confianza; los momentos poco claros no se puntuan.'
        when 'pt' then 'A qualidade e o angulo da camara afetam a confianca; momentos pouco claros nao sao pontuados.'
        when 'sr' then 'Kvalitet i ugao kamere uticu na pouzdanost; nejasni delovi se ne ocenjuju.'
        when 'fr' then 'La qualite et l angle de camera influencent la confiance; les moments flous ne sont pas notes.'
        when 'it' then 'Qualita e angolo della camera influenzano la confidenza; i momenti poco chiari non vengono valutati.'
        when 'nl' then 'Camerakwaliteit en hoek beinvloeden de betrouwbaarheid; onduidelijke momenten worden niet gescoord.'
        when 'tr' then 'Kamera kalitesi ve aci guveni etkiler; belirsiz anlar puanlanmaz.'
        when 'ar' then 'جودة وزاوية الكاميرا تؤثران على الثقة؛ اللحظات غير الواضحة لا يتم تقييمها.'
        else 'Camera quality and angle affect confidence; unclear moments are not scored.'
      end
    when 'evidence' then
      case locale_key
        when 'hr' then 'Jasno vidljiva nogometna akcija podupire ovu ocjenu.'
        when 'de' then 'Sichtbare Fussballaktion im Clip stuetzt diese Bewertung.'
        when 'bs' then 'Jasno vidljiva nogometna akcija podrzava ovu ocjenu.'
        when 'es' then 'La accion de futbol visible en el clip respalda esta puntuacion.'
        when 'pt' then 'A acao de futebol visivel no clipe sustenta esta pontuacao.'
        when 'sr' then 'Jasno vidljiva fudbalska akcija podrzava ovu ocenu.'
        when 'fr' then 'Une action de football visible dans le clip justifie cette note.'
        when 'it' then 'L azione calcistica visibile nel clip supporta questo punteggio.'
        when 'nl' then 'Zichtbare voetbalactie in de clip ondersteunt deze score.'
        when 'tr' then 'Klipte gorulen futbol aksiyonu bu puani destekliyor.'
        when 'ar' then 'اللقطة الكروية الظاهرة في الفيديو تدعم هذه الدرجة.'
        else 'Visible football action in this clip supports this score.'
      end
    when 'not_assessable' then
      case locale_key
        when 'hr' then 'Ova akcija nije dovoljno jasno vidljiva u ovom isjecku.'
        when 'de' then 'Diese Aktion ist in diesem Clip nicht klar genug sichtbar.'
        when 'bs' then 'Ova akcija nije dovoljno jasno vidljiva u ovom klipu.'
        when 'es' then 'Esta accion no se ve con suficiente claridad en este clip.'
        when 'pt' then 'Esta acao nao esta suficientemente visivel neste clipe.'
        when 'sr' then 'Ova akcija nije dovoljno jasno vidljiva u ovom klipu.'
        when 'fr' then 'Cette action n est pas suffisamment visible dans ce clip.'
        when 'it' then 'Questa azione non e abbastanza visibile in questo clip.'
        when 'nl' then 'Deze actie is niet duidelijk genoeg zichtbaar in deze clip.'
        when 'tr' then 'Bu aksiyon bu klipte yeterince net gorunmuyor.'
        when 'ar' then 'هذه اللقطة غير واضحة بما يكفي للتقييم في هذا الفيديو.'
        else 'This action is not clearly visible enough in this clip.'
      end
    when 'feedback' then
      case locale_key
        when 'hr' then 'Analiza se temelji samo na jasno vidljivim nogometnim akcijama. Fokusiraj se na metrike s najnizom ocjenom za iduci napredak.'
        when 'de' then 'Die Analyse basiert nur auf klar sichtbaren Fussballaktionen. Konzentriere dich auf die niedrigsten Metriken, um dich zu verbessern.'
        when 'bs' then 'Analiza je zasnovana samo na jasno vidljivim nogometnim akcijama. Fokusiraj se na metrike s najnizom ocjenom za napredak.'
        when 'es' then 'Este analisis se basa solo en acciones de futbol claramente visibles. Enfocate en las metricas mas bajas para mejorar.'
        when 'pt' then 'Esta analise baseia se apenas em acoes de futebol claramente visiveis. Foque se nas metricas mais baixas para evoluir.'
        when 'sr' then 'Analiza je zasnovana samo na jasno vidljivim fudbalskim akcijama. Fokusiraj se na metrike sa najnizom ocenom za napredak.'
        when 'fr' then 'Cette analyse se base uniquement sur les actions clairement visibles. Concentre toi sur les metriques les plus faibles pour progresser.'
        when 'it' then 'Questa analisi si basa solo su azioni calcistiche chiaramente visibili. Concentrati sulle metriche piu basse per migliorare.'
        when 'nl' then 'Deze analyse is alleen gebaseerd op duidelijk zichtbare voetbalacties. Focus op je laagste metrics om te verbeteren.'
        when 'tr' then 'Bu analiz yalnizca net gorulen futbol aksiyonlarina dayanir. Gelismek icin en dusuk metriklere odaklan.'
        when 'ar' then 'يعتمد هذا التحليل فقط على اللقطات الكروية الواضحة. ركّز على أقل المؤشرات لتحسين الأداء.'
        else 'This analysis is based only on clearly visible football actions. Focus on your lowest-rated metrics to improve your next clip.'
      end
    else null
  end;
$$;

with analysis_locale as (
  select
    a.id,
    public.goalnova_ai_locale_bucket(u.language_preference) as locale_key,
    a.visibility_analysis
  from public.ai_analyses a
  join public.users u on u.id = a.user_id
),
rewritten_metrics as (
  select
    al.id,
    jsonb_object_agg(
      m.key,
      jsonb_set(
        jsonb_set(
          m.value,
          '{evidence}',
          to_jsonb(
            case
              when public.goalnova_ai_is_legacy_english(m.value->>'evidence')
                then public.goalnova_ai_copy(al.locale_key, 'evidence')
              else coalesce(m.value->>'evidence', '')
            end
          ),
          true
        ),
        '{reason}',
        to_jsonb(
          case
            when public.goalnova_ai_is_legacy_english(m.value->>'reason')
              then public.goalnova_ai_copy(al.locale_key, 'not_assessable')
            else coalesce(m.value->>'reason', '')
          end
        ),
        true
      )
    ) as metrics_json
  from analysis_locale al
  join lateral jsonb_each(coalesce(al.visibility_analysis->'metrics', '{}'::jsonb)) as m(key, value) on true
  group by al.id
)
update public.ai_analyses a
set
  feedback_text = case
    when public.goalnova_ai_is_legacy_english(a.feedback_text)
      then public.goalnova_ai_copy(public.goalnova_ai_locale_bucket(u.language_preference), 'feedback')
    else a.feedback_text
  end,
  visibility_analysis = case
    when a.visibility_analysis is null then a.visibility_analysis
    else jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            a.visibility_analysis,
            '{clip_summary}',
            to_jsonb(
              case
                when public.goalnova_ai_is_legacy_english(a.visibility_analysis->>'clip_summary')
                  then public.goalnova_ai_copy(public.goalnova_ai_locale_bucket(u.language_preference), 'clip_summary')
                else coalesce(a.visibility_analysis->>'clip_summary', '')
              end
            ),
            true
          ),
          '{camera,assessment_note}',
          to_jsonb(
            case
              when public.goalnova_ai_is_legacy_english(a.visibility_analysis#>>'{camera,assessment_note}')
                then public.goalnova_ai_copy(public.goalnova_ai_locale_bucket(u.language_preference), 'camera_note')
              else coalesce(a.visibility_analysis#>>'{camera,assessment_note}', '')
            end
          ),
          true
        ),
        '{camera,quality}',
        to_jsonb(
          case lower(coalesce(a.visibility_analysis#>>'{camera,quality}', ''))
            when 'strong' then
              case public.goalnova_ai_locale_bucket(u.language_preference)
                when 'hr' then 'jako'
                when 'de' then 'stark'
                when 'bs' then 'jako'
                when 'es' then 'alta'
                when 'pt' then 'forte'
                when 'sr' then 'jako'
                when 'fr' then 'forte'
                when 'it' then 'alta'
                when 'nl' then 'sterk'
                when 'tr' then 'yuksek'
                when 'ar' then 'قوي'
                else 'strong'
              end
            when 'adequate' then
              case public.goalnova_ai_locale_bucket(u.language_preference)
                when 'hr' then 'solidno'
                when 'de' then 'ausreichend'
                when 'bs' then 'solidno'
                when 'es' then 'aceptable'
                when 'pt' then 'adequada'
                when 'sr' then 'solidno'
                when 'fr' then 'correcte'
                when 'it' then 'adeguata'
                when 'nl' then 'voldoende'
                when 'tr' then 'yeterli'
                when 'ar' then 'مقبول'
                else 'adequate'
              end
            when 'limited' then
              case public.goalnova_ai_locale_bucket(u.language_preference)
                when 'hr' then 'ograniceno'
                when 'de' then 'begrenzt'
                when 'bs' then 'ograniceno'
                when 'es' then 'limitada'
                when 'pt' then 'limitada'
                when 'sr' then 'ograniceno'
                when 'fr' then 'limitee'
                when 'it' then 'limitata'
                when 'nl' then 'beperkt'
                when 'tr' then 'sinirli'
                when 'ar' then 'محدود'
                else 'limited'
              end
            else coalesce(a.visibility_analysis#>>'{camera,quality}', '')
          end
        ),
        true
      ),
      '{metrics}',
      coalesce((select rm.metrics_json from rewritten_metrics rm where rm.id = a.id), '{}'::jsonb),
      true
    )
  end
from public.users u
where u.id = a.user_id;

drop function if exists public.goalnova_ai_copy(text, text);
drop function if exists public.goalnova_ai_is_legacy_english(text);
drop function if exists public.goalnova_ai_locale_bucket(text);

-- ---------------------------------------------------------------------------
-- Account recovery → support_tickets (20260510123500_account_recovery_support_tickets.sql)
-- ---------------------------------------------------------------------------

alter table public.support_tickets
  alter column user_id drop not null;

alter table public.support_tickets
  add column if not exists ticket_type text not null default 'general'
    check (ticket_type in ('general', 'account_recovery')),
  add column if not exists account_email text,
  add column if not exists contact_email text,
  add column if not exists username text;

create index if not exists support_tickets_ticket_type_idx
  on public.support_tickets (ticket_type);

drop function if exists public.pitchrusch_submit_account_recovery_ticket(text, text, text, text);
drop function if exists public.goalnova_submit_account_recovery_ticket(text, text, text, text);

create or replace function public.goalnova_submit_account_recovery_ticket(
  p_account_email text,
  p_contact_email text,
  p_message text,
  p_username text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  a text := trim(lower(coalesce(p_account_email, '')));
  c text := trim(lower(coalesce(p_contact_email, '')));
  m text := trim(coalesce(p_message, ''));
  u text := nullif(trim(coalesce(p_username, '')), '');
begin
  if length(a) < 5 or length(a) > 254 or position('@' in a) < 2 then
    raise exception 'Invalid account email';
  end if;
  if length(c) < 5 or length(c) > 254 or position('@' in c) < 2 then
    raise exception 'Invalid contact email';
  end if;
  if length(m) < 10 then
    raise exception 'Message too short';
  end if;
  if length(m) > 4000 then
    raise exception 'Message too long';
  end if;
  if u is not null and length(u) > 120 then
    raise exception 'Username too long';
  end if;

  insert into public.support_tickets (
    user_id,
    subject,
    message,
    category,
    ticket_type,
    account_email,
    contact_email,
    username,
    status,
    priority
  )
  values (
    null,
    'Account recovery request',
    m,
    'account_issue',
    'account_recovery',
    a,
    c,
    u,
    'open',
    'normal'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.goalnova_submit_account_recovery_ticket(text, text, text, text)
  from public;
grant execute on function public.goalnova_submit_account_recovery_ticket(text, text, text, text)
  to anon;
grant execute on function public.goalnova_submit_account_recovery_ticket(text, text, text, text)
  to authenticated;

create or replace function public.pitchrusch_submit_account_recovery_ticket(
  p_account_email text,
  p_contact_email text,
  p_message text,
  p_username text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.goalnova_submit_account_recovery_ticket(
    p_account_email,
    p_contact_email,
    p_message,
    p_username
  );
$$;

revoke all on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  from public;
grant execute on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  to anon;
grant execute on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- RLS: anon + authenticated INSERT for account_recovery only (20260510160000)
-- ---------------------------------------------------------------------------

drop policy if exists "support_tickets_insert_account_recovery" on public.support_tickets;

create policy "support_tickets_insert_account_recovery"
on public.support_tickets
for insert
to anon, authenticated
with check (
  ticket_type = 'account_recovery'
  and user_id is null
  and status = 'open'
  and priority = 'normal'
  and category = 'account_issue'
  and trim(subject) = 'Account recovery request'
  and assigned_admin_id is null
  and internal_note is null
  and account_email is not null
  and length(trim(account_email)) between 5 and 254
  and position('@' in trim(account_email)) >= 2
  and contact_email is not null
  and length(trim(contact_email)) between 5 and 254
  and position('@' in trim(contact_email)) >= 2
  and message is not null
  and length(trim(message)) between 10 and 4000
  and (username is null or length(trim(username)) <= 120)
);

-- Player referrals + invite rewards (idempotent, safe re-run)

-- ---------------------------------------------------------------------------
-- 1) Subscription guard: allow SECURITY DEFINER referral grants
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_guard_subscription_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if coalesce(nullif(current_setting('app.goalnova_bypass_subscription_guard', true), ''), '') = 'on' then
    return new;
  end if;

  if coalesce(new.subscription_plan, '') is distinct from coalesce(old.subscription_plan, '')
     or coalesce(new.subscription_status, '') is distinct from coalesce(old.subscription_status, '')
     or coalesce(new.subscription_current_period_end::text, '') is distinct from coalesce(old.subscription_current_period_end::text, '')
     or coalesce(new.stripe_customer_id, '') is distinct from coalesce(old.stripe_customer_id, '')
     or coalesce(new.stripe_subscription_id, '') is distinct from coalesce(old.stripe_subscription_id, '') then
    raise exception 'subscription fields are managed by billing webhooks only';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) player_profiles: referral + featured boost window
-- ---------------------------------------------------------------------------
alter table public.player_profiles
add column if not exists referral_code text null;

alter table public.player_profiles
add column if not exists referred_by uuid null references auth.users (id) on delete set null;

alter table public.player_profiles
add column if not exists featured_player_until timestamptz null;

create unique index if not exists player_profiles_referral_code_uidx
on public.player_profiles (referral_code)
where referral_code is not null;

create index if not exists player_profiles_referred_by_idx
on public.player_profiles (referred_by)
where referred_by is not null;

comment on column public.player_profiles.referral_code is 'Shareable invite code (unique when set).';
comment on column public.player_profiles.referred_by is 'Auth user id of the referrer (set once).';
comment on column public.player_profiles.featured_player_until is 'Referral Featured Player visibility boost until this instant.';

-- ---------------------------------------------------------------------------
-- 3) player_referrals (one completed referral per new account)
-- ---------------------------------------------------------------------------
create table if not exists public.player_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null references auth.users (id) on delete cascade,
  referral_code text not null,
  status text not null default 'completed',
  reward_type text null,
  created_at timestamptz not null default now(),
  unique (referred_user_id)
);

create index if not exists player_referrals_referrer_idx
on public.player_referrals (referrer_user_id);

create index if not exists player_referrals_code_idx
on public.player_referrals (referral_code);

alter table public.player_referrals enable row level security;

drop policy if exists "player_referrals_select_own" on public.player_referrals;
create policy "player_referrals_select_own"
on public.player_referrals
for select
to authenticated
using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

-- ---------------------------------------------------------------------------
-- 4) Idempotent reward grants
-- ---------------------------------------------------------------------------
create table if not exists public.player_referral_reward_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  reward_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, reward_key)
);

alter table public.player_referral_reward_grants enable row level security;

drop policy if exists "player_referral_reward_grants_select_own" on public.player_referral_reward_grants;
create policy "player_referral_reward_grants_select_own"
on public.player_referral_reward_grants
for select
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5) Helpers: ensure referral code
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_player_ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing text;
  candidate text;
  attempts int := 0;
  n int := 0;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select pp.referral_code into existing
  from public.player_profiles pp
  join public.users u on u.id = pp.id
  where pp.id = me and u.role = 'player';

  if existing is not null and length(trim(existing)) > 0 then
    return existing;
  end if;

  if not exists (select 1 from public.users u where u.id = me and u.role = 'player') then
    raise exception 'Referral codes are only available for player accounts';
  end if;

  insert into public.player_profiles (id)
  values (me)
  on conflict (id) do nothing;

  loop
    attempts := attempts + 1;
    if attempts > 40 then
      raise exception 'Could not allocate referral code';
    end if;
    candidate := upper(left(replace(gen_random_uuid()::text, '-', ''), 12));
    begin
      update public.player_profiles pp
      set referral_code = candidate
      where pp.id = me
        and pp.referral_code is null;
      get diagnostics n = row_count;
      if n > 0 then
        return candidate;
      end if;
      select pp2.referral_code into existing from public.player_profiles pp2 where pp2.id = me;
      if existing is not null and length(trim(existing)) > 0 then
        return existing;
      end if;
    exception
      when unique_violation then
        null;
    end;
  end loop;
  raise exception 'referral code allocation failed';
end;
$$;

revoke all on function public.goalnova_player_ensure_referral_code() from public;
grant execute on function public.goalnova_player_ensure_referral_code() to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Apply milestone rewards (internal; called after a new referral row)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_player_referral_apply_milestones(p_referrer uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_new_end timestamptz;
  v_stripe_sub text;
  v_now timestamptz := now();
  v_ins int;
  v_ins2 int;
begin
  if p_referrer is null then
    return;
  end if;

  select count(*)::int into v_count
  from public.player_referrals r
  where r.referrer_user_id = p_referrer
    and r.status = 'completed';

  -- Milestone: 3 invites → 1 month Player Premium (skip if paid Stripe sub is active)
  if v_count >= 3 then
    insert into public.player_referral_reward_grants (user_id, reward_key)
    values (p_referrer, 'invite_3_player_premium')
    on conflict (user_id, reward_key) do nothing;
    get diagnostics v_ins = row_count;
    if v_ins > 0 then
      select coalesce(pp.stripe_subscription_id, '') into v_stripe_sub
      from public.player_profiles pp
      where pp.id = p_referrer;

      if v_stripe_sub is null or length(trim(v_stripe_sub)) = 0 then
        select coalesce(
          greatest(coalesce(pp.subscription_current_period_end, v_now), v_now) + interval '30 days',
          v_now + interval '30 days'
        )
        into v_new_end
        from public.player_profiles pp
        where pp.id = p_referrer;

        if v_new_end is null then
          v_new_end := v_now + interval '30 days';
        end if;

        begin
          perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);

          update public.player_profiles pp
          set
            subscription_plan = 'player_premium',
            subscription_status = 'active',
            subscription_current_period_end = v_new_end
          where pp.id = p_referrer;

          update public.users u
          set
            subscription_plan = 'player_premium',
            subscription_status = 'active',
            subscription_current_period_end = v_new_end,
            is_premium = true
          where u.id = p_referrer;

          perform set_config('app.goalnova_bypass_subscription_guard', '', true);
        exception
          when others then
            perform set_config('app.goalnova_bypass_subscription_guard', '', true);
            raise;
        end;
      end if;
    end if;
  end if;

  -- Milestone: 10 invites → Featured Player boost 7 days
  if v_count >= 10 then
    insert into public.player_referral_reward_grants (user_id, reward_key)
    values (p_referrer, 'invite_10_featured_player')
    on conflict (user_id, reward_key) do nothing;
    get diagnostics v_ins2 = row_count;
    if v_ins2 > 0 then
      update public.player_profiles pp
      set featured_player_until = greatest(
        coalesce(pp.featured_player_until, v_now),
        v_now
      ) + interval '7 days'
      where pp.id = p_referrer;
    end if;
  end if;
end;
$$;

revoke all on function public.goalnova_player_referral_apply_milestones(uuid) from public;

-- ---------------------------------------------------------------------------
-- 7) Complete referral for the signed-in referred player
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_player_complete_referral(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  code text := upper(trim(coalesce(p_referral_code, '')));
  ref_user uuid;
  role text;
  already uuid;
  inserted int := 0;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  if code is null or length(code) < 4 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  select u.role into role from public.users u where u.id = me;
  if role is distinct from 'player' then
    return jsonb_build_object('ok', false, 'reason', 'not_player_role');
  end if;

  if not exists (select 1 from public.player_profiles pp where pp.id = me) then
    return jsonb_build_object('ok', false, 'reason', 'no_player_profile');
  end if;

  select pp.referred_by into already from public.player_profiles pp where pp.id = me;
  if already is not null then
    return jsonb_build_object('ok', true, 'noop', true, 'reason', 'already_referred');
  end if;

  select pp.id into ref_user
  from public.player_profiles pp
  join public.users u on u.id = pp.id
  where pp.referral_code = code
    and u.role = 'player'
    and pp.id <> me
  limit 1;

  if ref_user is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_code');
  end if;

  insert into public.player_referrals (
    referrer_user_id,
    referred_user_id,
    referral_code,
    status
  )
  values (ref_user, me, code, 'completed')
  on conflict (referred_user_id) do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return jsonb_build_object('ok', true, 'noop', true, 'reason', 'referral_exists');
  end if;

  update public.player_profiles pp
  set referred_by = ref_user
  where pp.id = me
    and pp.referred_by is null;

  perform public.goalnova_player_referral_apply_milestones(ref_user);

  return jsonb_build_object('ok', true, 'referrer_user_id', ref_user);
end;
$$;

revoke all on function public.goalnova_player_complete_referral(text) from public;
grant execute on function public.goalnova_player_complete_referral(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Dashboard payload for Invite friends UI
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_player_referral_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  role text;
  c text;
  cnt int := 0;
  grants text[];
  feat timestamptz;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select u.role into role from public.users u where u.id = me;
  if role is distinct from 'player' then
    return jsonb_build_object('ok', false, 'reason', 'not_player_role');
  end if;

  begin
    c := public.goalnova_player_ensure_referral_code();
  exception
    when others then
      return jsonb_build_object('ok', false, 'reason', 'ensure_code_failed');
  end;

  select pp.referral_code, pp.featured_player_until
  into c, feat
  from public.player_profiles pp
  where pp.id = me;

  select count(*)::int into cnt
  from public.player_referrals r
  where r.referrer_user_id = me
    and r.status = 'completed';

  select coalesce(array_agg(g.reward_key order by g.reward_key), array[]::text[])
  into grants
  from public.player_referral_reward_grants g
  where g.user_id = me;

  return jsonb_build_object(
    'ok', true,
    'referral_code', c,
    'invite_count', cnt,
    'featured_player_until', feat,
    'granted_keys', to_jsonb(coalesce(grants, array[]::text[]))
  );
end;
$$;

revoke all on function public.goalnova_player_referral_dashboard() from public;
grant execute on function public.goalnova_player_referral_dashboard() to authenticated;
