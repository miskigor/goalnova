-- Security Advisor: enable RLS on public tables that were exposed without RLS (or had
-- policies defined while RLS was off). Idempotent re-run of required policies only.
-- Service role / security-definer RPCs bypass RLS for admin and background jobs.

-- ---------------------------------------------------------------------------
-- Helper: video row has at least one non-empty playable URL (matches home/explore feeds).
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_video_has_playable_url(v public.videos)
returns boolean
language sql
stable
as $$
  select (
    v.video_url is not null and length(trim(v.video_url)) > 0
  ) or (
    v.processed_video_url is not null and length(trim(v.processed_video_url)) > 0
  ) or (
    v.source_video_url is not null and length(trim(v.source_video_url)) > 0
  );
$$;

comment on function public.goalnova_video_has_playable_url(public.videos) is
  'True when the video row has a non-empty playback URL (home/explore feed predicate).';

-- ===========================================================================
-- public.follows (no prior RLS migration in repo; table used by client)
-- ===========================================================================
alter table public.follows enable row level security;

drop policy if exists "follows_select_public" on public.follows;
create policy "follows_select_public"
  on public.follows
  for select
  to anon, authenticated
  using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
  on public.follows
  for insert
  to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
  on public.follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);

grant select on table public.follows to anon, authenticated;
grant insert, delete on table public.follows to authenticated;

-- ===========================================================================
-- public.scout_profiles
-- ===========================================================================
alter table public.scout_profiles enable row level security;

drop policy if exists "scout_profiles_select_own" on public.scout_profiles;
create policy "scout_profiles_select_own"
  on public.scout_profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- No peer SELECT on the table (stripe_*, subscription_* must not leak).
drop policy if exists "scout_profiles_select_authenticated" on public.scout_profiles;

create or replace function public.get_scout_profile_display_names(p_user_ids uuid[])
returns table (
  id uuid,
  organization text,
  avatar_url text,
  display_name text,
  verification_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.id,
    nullif(trim(sp.organization), '')::text as organization,
    coalesce(
      nullif(trim(u.avatar_url), ''),
      nullif(trim(sp.avatar_url), '')
    )::text as avatar_url,
    coalesce(
      nullif(trim(sp.organization), ''),
      nullif(trim(sp.bio), ''),
      'Scout'
    )::text as display_name,
    coalesce(u.scout_verification_status, 'none')::text as verification_status
  from public.scout_profiles sp
  inner join public.users u on u.id = sp.id
  where p_user_ids is not null
    and cardinality(p_user_ids) > 0
    and sp.id = any (p_user_ids)
    and coalesce(u.is_deleted, false) = false;
$$;

comment on function public.get_scout_profile_display_names(uuid[]) is
  'Safe scout display fields for messaging/UI (no stripe or subscription columns).';

revoke all on function public.get_scout_profile_display_names(uuid[]) from public;
grant execute on function public.get_scout_profile_display_names(uuid[]) to authenticated;

drop policy if exists "scout_profiles_insert_own" on public.scout_profiles;
create policy "scout_profiles_insert_own"
  on public.scout_profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "scout_profiles_update_own" on public.scout_profiles;
create policy "scout_profiles_update_own"
  on public.scout_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, insert, update on table public.scout_profiles to authenticated;

-- ===========================================================================
-- public.videos
-- ===========================================================================
alter table public.videos enable row level security;

-- Remove overly broad policy (SELECT true for all rows).
drop policy if exists "videos_select_public" on public.videos;

drop policy if exists "videos_select_explore_public" on public.videos;
create policy "videos_select_explore_public"
  on public.videos
  for select
  to anon, authenticated
  using (public.goalnova_video_has_playable_url(videos));

drop policy if exists "videos_select_own" on public.videos;
create policy "videos_select_own"
  on public.videos
  for select
  to authenticated
  using (auth.uid() = user_id);

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

drop policy if exists "videos_update_own" on public.videos;
create policy "videos_update_own"
  on public.videos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "videos_update_own_featured" on public.videos;
create policy "videos_update_own_featured"
  on public.videos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "videos_delete_own" on public.videos;
create policy "videos_delete_own"
  on public.videos
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "videos_update_staff" on public.videos;
create policy "videos_update_staff"
  on public.videos
  for update
  to authenticated
  using (public.goalnova_staff_effective_role() is not null)
  with check (public.goalnova_staff_effective_role() is not null);

grant select on table public.videos to anon, authenticated;
grant insert, update, delete on table public.videos to authenticated;

-- ===========================================================================
-- public.challenge_entries
-- ===========================================================================
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

drop policy if exists "challenge_entries_delete_own_video" on public.challenge_entries;
create policy "challenge_entries_delete_own_video"
  on public.challenge_entries
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and v.user_id = auth.uid()
    )
  );

drop policy if exists "challenge_entries_delete_staff" on public.challenge_entries;
create policy "challenge_entries_delete_staff"
  on public.challenge_entries
  for delete
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

grant select on table public.challenge_entries to anon, authenticated;
grant insert, update, delete on table public.challenge_entries to authenticated;

-- ===========================================================================
-- public.challenges
-- ===========================================================================
alter table public.challenges enable row level security;

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

grant select on table public.challenges to anon, authenticated;
grant insert, update on table public.challenges to authenticated;

-- ===========================================================================
-- public.ai_analyses
-- ===========================================================================
alter table public.ai_analyses enable row level security;

drop policy if exists "ai_analyses_select_own" on public.ai_analyses;
create policy "ai_analyses_select_own"
  on public.ai_analyses
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_analyses_select_video_owner" on public.ai_analyses;
create policy "ai_analyses_select_video_owner"
  on public.ai_analyses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.videos v
      where v.id = ai_analyses.video_id
        and v.user_id = auth.uid()
    )
  );

-- Public rankings / explore / challenge highlights: feed-visible videos only;
-- exclude invalid/internal football analyses (app already filters these in feeds).
drop policy if exists "ai_analyses_select_public_challenge_videos" on public.ai_analyses;
drop policy if exists "ai_analyses_select_public_playable_videos" on public.ai_analyses;
create policy "ai_analyses_select_public_playable_videos"
  on public.ai_analyses
  for select
  to anon, authenticated
  using (
    coalesce(ai_analyses.valid_for_football_analysis, true) = true
    and exists (
      select 1
      from public.videos v
      where v.id = ai_analyses.video_id
        and public.goalnova_video_has_playable_url(v)
    )
  );

drop policy if exists "ai_analyses_select_approved_scout" on public.ai_analyses;
create policy "ai_analyses_select_approved_scout"
  on public.ai_analyses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'scout'
        and coalesce(u.scout_verification_status, 'none') = 'approved'
    )
  );

drop policy if exists "ai_analyses_insert_premium_self" on public.ai_analyses;
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

drop policy if exists "ai_analyses_update_premium_self" on public.ai_analyses;
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

drop policy if exists "ai_analyses_insert_challenge_submission" on public.ai_analyses;
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

drop policy if exists "ai_analyses_update_challenge_submission" on public.ai_analyses;
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

drop policy if exists "ai_analyses_insert_scout_insight" on public.ai_analyses;
create policy "ai_analyses_insert_scout_insight"
  on public.ai_analyses
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.goalnova_scout_has_insight_event(video_id)
  );

drop policy if exists "ai_analyses_update_scout_insight" on public.ai_analyses;
create policy "ai_analyses_update_scout_insight"
  on public.ai_analyses
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.goalnova_scout_has_insight_event(video_id)
  )
  with check (
    auth.uid() = user_id
    and public.goalnova_scout_has_insight_event(video_id)
  );

grant select on table public.ai_analyses to anon, authenticated;
grant insert, update on table public.ai_analyses to authenticated;

-- ===========================================================================
-- public.video_processing_jobs — backend only (no client policies)
-- ===========================================================================
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'video_processing_jobs'
      and c.relkind = 'r'
  ) then
    execute 'alter table public.video_processing_jobs enable row level security';
  end if;
end
$$;
