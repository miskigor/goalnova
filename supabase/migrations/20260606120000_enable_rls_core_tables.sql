-- Enable RLS on core public tables flagged by Supabase Security Advisor.
-- Idempotent: safe to run in SQL Editor even if policies already exist.
-- Prerequisite functions: goalnova_staff_effective_role(), goalnova_scout_has_insight_event()
-- Service role and SECURITY DEFINER RPCs bypass RLS (Stripe webhooks, admin merge, referrals).
--
-- Security tightening (v2):
-- - ai_analyses: no anon SELECT; no public-playable policy on full rows
-- - videos: public SELECT requires playable URL + active owner (no status/visibility cols in schema)
-- - challenge_entries: public SELECT tied to active/ended challenge + playable video + active owner
-- - player_profiles: full-row SELECT only own + staff; other users via safe SECURITY DEFINER RPCs
-- - follows: SELECT authenticated only (follow graph not exposed to anon)

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_video_has_playable_url(v public.videos)
returns boolean
language sql
stable
set search_path = public
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

create or replace function public.goalnova_user_is_active(p_user_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and coalesce(u.is_deleted, false) = false
  );
$$;

comment on function public.goalnova_user_is_active(uuid) is
  'False for soft-deleted users; used by public feed/profile predicates.';

-- Safe player profile projection (no stripe_*, referred_by, referral/subscription columns).
-- Full-table SELECT on player_profiles is limited to owner + staff; all other reads use these RPCs.
create or replace function public.goalnova_public_player_profile_row(p_user_id uuid)
returns table (
  id uuid,
  full_name text,
  username text,
  age int,
  bio text,
  "position" text,
  preferred_foot text,
  height int,
  weight int,
  city text,
  country text,
  club text,
  avatar_url text,
  profile_completeness int,
  ai_overall_score double precision,
  is_available_for_trials boolean,
  is_looking_for_club boolean,
  achievements text[],
  career_history jsonb,
  profile_highlight text,
  created_at timestamptz,
  featured_player_until timestamptz,
  founding_player boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.id,
    pp.full_name,
    pp.username,
    pp.age,
    pp.bio,
    pp.position as "position",
    pp.preferred_foot,
    pp.height,
    pp.weight,
    pp.city,
    pp.country,
    pp.club,
    nullif(trim(u.avatar_url), '') as avatar_url,
    (
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
    )::int as profile_completeness,
    (
      select max(a.overall_score)
      from public.ai_analyses a
      inner join public.videos v on v.id = a.video_id
      where v.user_id = pp.id
        and coalesce(a.valid_for_football_analysis, true) = true
    ) as ai_overall_score,
    false as is_available_for_trials,
    false as is_looking_for_club,
    '{}'::text[] as achievements,
    '[]'::jsonb as career_history,
    null::text as profile_highlight,
    pp.created_at,
    pp.featured_player_until,
    pp.founding_player
  from public.player_profiles pp
  inner join public.users u on u.id = pp.id
  where pp.id = p_user_id
    and public.goalnova_user_is_active(pp.id);
$$;

comment on function public.goalnova_public_player_profile_row(uuid) is
  'Public-safe single player profile (excludes stripe_*, referred_by, referral_code, subscription_*).';

create or replace function public.goalnova_public_player_profile_by_username(p_username text)
returns table (
  id uuid,
  full_name text,
  username text,
  age int,
  bio text,
  "position" text,
  preferred_foot text,
  height int,
  weight int,
  city text,
  country text,
  club text,
  avatar_url text,
  profile_completeness int,
  ai_overall_score double precision,
  is_available_for_trials boolean,
  is_looking_for_club boolean,
  achievements text[],
  career_history jsonb,
  profile_highlight text,
  created_at timestamptz,
  featured_player_until timestamptz,
  founding_player boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.id,
    pp.full_name,
    pp.username,
    pp.age,
    pp.bio,
    pp.position as "position",
    pp.preferred_foot,
    pp.height,
    pp.weight,
    pp.city,
    pp.country,
    pp.club,
    nullif(trim(u.avatar_url), '') as avatar_url,
    (
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
    )::int as profile_completeness,
    (
      select max(a.overall_score)
      from public.ai_analyses a
      inner join public.videos v on v.id = a.video_id
      where v.user_id = pp.id
        and coalesce(a.valid_for_football_analysis, true) = true
    ) as ai_overall_score,
    false as is_available_for_trials,
    false as is_looking_for_club,
    '{}'::text[] as achievements,
    '[]'::jsonb as career_history,
    null::text as profile_highlight,
    pp.created_at,
    pp.featured_player_until,
    pp.founding_player
  from public.player_profiles pp
  inner join public.users u on u.id = pp.id
  where lower(trim(pp.username)) = lower(trim(p_username))
    and public.goalnova_user_is_active(pp.id);
$$;

comment on function public.goalnova_public_player_profile_by_username(text) is
  'Public-safe player profile lookup by username (case-insensitive exact match).';

create or replace function public.goalnova_public_player_profiles_by_ids(p_user_ids uuid[])
returns table (
  id uuid,
  full_name text,
  username text,
  age int,
  bio text,
  "position" text,
  preferred_foot text,
  height int,
  weight int,
  city text,
  country text,
  club text,
  avatar_url text,
  profile_completeness int,
  ai_overall_score double precision,
  is_available_for_trials boolean,
  is_looking_for_club boolean,
  achievements text[],
  career_history jsonb,
  profile_highlight text,
  created_at timestamptz,
  featured_player_until timestamptz,
  founding_player boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.id,
    pp.full_name,
    pp.username,
    pp.age,
    pp.bio,
    pp.position as "position",
    pp.preferred_foot,
    pp.height,
    pp.weight,
    pp.city,
    pp.country,
    pp.club,
    nullif(trim(u.avatar_url), '') as avatar_url,
    (
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
    )::int as profile_completeness,
    (
      select max(a.overall_score)
      from public.ai_analyses a
      inner join public.videos v on v.id = a.video_id
      where v.user_id = pp.id
        and coalesce(a.valid_for_football_analysis, true) = true
    ) as ai_overall_score,
    false as is_available_for_trials,
    false as is_looking_for_club,
    '{}'::text[] as achievements,
    '[]'::jsonb as career_history,
    null::text as profile_highlight,
    pp.created_at,
    pp.featured_player_until,
    pp.founding_player
  from public.player_profiles pp
  inner join public.users u on u.id = pp.id
  where p_user_ids is not null
    and cardinality(p_user_ids) > 0
    and pp.id = any (p_user_ids)
    and public.goalnova_user_is_active(pp.id);
$$;

comment on function public.goalnova_public_player_profiles_by_ids(uuid[]) is
  'Batch public-safe player profiles for feeds/search/cards (no billing or referral columns).';

create or replace function public.goalnova_public_player_profiles_discover(p_limit int default 300)
returns table (
  id uuid,
  full_name text,
  username text,
  age int,
  bio text,
  "position" text,
  preferred_foot text,
  height int,
  weight int,
  city text,
  country text,
  club text,
  avatar_url text,
  profile_completeness int,
  ai_overall_score double precision,
  is_available_for_trials boolean,
  is_looking_for_club boolean,
  achievements text[],
  career_history jsonb,
  profile_highlight text,
  created_at timestamptz,
  featured_player_until timestamptz,
  founding_player boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.id,
    pp.full_name,
    pp.username,
    pp.age,
    pp.bio,
    pp.position as "position",
    pp.preferred_foot,
    pp.height,
    pp.weight,
    pp.city,
    pp.country,
    pp.club,
    nullif(trim(u.avatar_url), '') as avatar_url,
    (
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
    )::int as profile_completeness,
    (
      select max(a.overall_score)
      from public.ai_analyses a
      inner join public.videos v on v.id = a.video_id
      where v.user_id = pp.id
        and coalesce(a.valid_for_football_analysis, true) = true
    ) as ai_overall_score,
    false as is_available_for_trials,
    false as is_looking_for_club,
    '{}'::text[] as achievements,
    '[]'::jsonb as career_history,
    null::text as profile_highlight,
    pp.created_at,
    pp.featured_player_until,
    pp.founding_player
  from public.player_profiles pp
  inner join public.users u on u.id = pp.id
  where public.goalnova_user_is_active(pp.id)
  order by pp.created_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 300), 500));
$$;

comment on function public.goalnova_public_player_profiles_discover(int) is
  'Discover/list safe player profiles for client-side filtering (no billing or referral columns).';

-- Server-side player search (name/username ilike + optional profile filters).
create or replace function public.goalnova_public_player_profiles_search(
  p_q text default null,
  p_position text default null,
  p_country text default null,
  p_city text default null,
  p_age_min int default null,
  p_age_max int default null,
  p_preferred_foot text default null,
  p_club text default null,
  p_limit int default 40
)
returns table (
  id uuid,
  full_name text,
  username text,
  age int,
  bio text,
  "position" text,
  preferred_foot text,
  height int,
  weight int,
  city text,
  country text,
  club text,
  avatar_url text,
  profile_completeness int,
  ai_overall_score double precision,
  is_available_for_trials boolean,
  is_looking_for_club boolean,
  achievements text[],
  career_history jsonb,
  profile_highlight text,
  created_at timestamptz,
  featured_player_until timestamptz,
  founding_player boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.id,
    pp.full_name,
    pp.username,
    pp.age,
    pp.bio,
    pp.position as "position",
    pp.preferred_foot,
    pp.height,
    pp.weight,
    pp.city,
    pp.country,
    pp.club,
    nullif(trim(u.avatar_url), '') as avatar_url,
    (
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
    )::int as profile_completeness,
    (
      select max(a.overall_score)
      from public.ai_analyses a
      inner join public.videos v on v.id = a.video_id
      where v.user_id = pp.id
        and coalesce(a.valid_for_football_analysis, true) = true
    ) as ai_overall_score,
    false as is_available_for_trials,
    false as is_looking_for_club,
    '{}'::text[] as achievements,
    '[]'::jsonb as career_history,
    null::text as profile_highlight,
    pp.created_at,
    pp.featured_player_until,
    pp.founding_player
  from public.player_profiles pp
  inner join public.users u on u.id = pp.id
  where public.goalnova_user_is_active(pp.id)
    and (
      coalesce(trim(p_q), '') = ''
      or coalesce(pp.full_name, '') ilike ('%' || trim(p_q) || '%')
      or coalesce(pp.username, '') ilike ('%' || trim(p_q) || '%')
    )
    and (
      coalesce(trim(p_position), '') = ''
      or coalesce(pp.position, '') ilike ('%' || trim(p_position) || '%')
    )
    and (
      coalesce(trim(p_country), '') = ''
      or coalesce(pp.country, '') ilike ('%' || trim(p_country) || '%')
    )
    and (
      coalesce(trim(p_city), '') = ''
      or coalesce(pp.city, '') ilike ('%' || trim(p_city) || '%')
    )
    and (
      coalesce(trim(p_preferred_foot), '') = ''
      or coalesce(pp.preferred_foot, '') ilike ('%' || trim(p_preferred_foot) || '%')
    )
    and (
      coalesce(trim(p_club), '') = ''
      or coalesce(pp.club, '') ilike ('%' || trim(p_club) || '%')
    )
    and (p_age_min is null or pp.age is null or pp.age >= p_age_min)
    and (p_age_max is null or pp.age is null or pp.age <= p_age_max)
    and (
      coalesce(trim(p_q), '') <> ''
      or coalesce(trim(p_position), '') <> ''
      or coalesce(trim(p_country), '') <> ''
      or coalesce(trim(p_city), '') <> ''
      or coalesce(trim(p_preferred_foot), '') <> ''
      or coalesce(trim(p_club), '') <> ''
      or p_age_min is not null
      or p_age_max is not null
    )
  order by pp.full_name nulls last, pp.created_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;

comment on function public.goalnova_public_player_profiles_search(
  text, text, text, text, int, int, text, text, int
) is
  'Public-safe player search by name/username and optional profile filters (no billing columns).';

create or replace function public.goalnova_scout_player_profiles_by_ids(p_user_ids uuid[])
returns table (
  id uuid,
  full_name text,
  username text,
  age int,
  bio text,
  "position" text,
  preferred_foot text,
  height int,
  weight int,
  city text,
  country text,
  club text,
  avatar_url text,
  profile_completeness int,
  ai_overall_score double precision,
  is_available_for_trials boolean,
  is_looking_for_club boolean,
  achievements text[],
  career_history jsonb,
  profile_highlight text,
  created_at timestamptz,
  featured_player_until timestamptz,
  founding_player boolean,
  is_player_premium boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.id,
    pp.full_name,
    pp.username,
    pp.age,
    pp.bio,
    pp.position as "position",
    pp.preferred_foot,
    pp.height,
    pp.weight,
    pp.city,
    pp.country,
    pp.club,
    nullif(trim(pu.avatar_url), '') as avatar_url,
    (
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
    )::int as profile_completeness,
    (
      select max(a.overall_score)
      from public.ai_analyses a
      inner join public.videos v on v.id = a.video_id
      where v.user_id = pp.id
        and coalesce(a.valid_for_football_analysis, true) = true
    ) as ai_overall_score,
    false as is_available_for_trials,
    false as is_looking_for_club,
    '{}'::text[] as achievements,
    '[]'::jsonb as career_history,
    null::text as profile_highlight,
    pp.created_at,
    pp.featured_player_until,
    pp.founding_player,
    (
      coalesce(pp.subscription_plan, '') = 'player_premium'
      and coalesce(pp.subscription_status, '') = 'active'
    ) as is_player_premium
  from public.player_profiles pp
  inner join public.users pu on pu.id = pp.id
  where p_user_ids is not null
    and cardinality(p_user_ids) > 0
    and pp.id = any (p_user_ids)
    and public.goalnova_user_is_active(pp.id)
    and (
      public.goalnova_staff_effective_role() is not null
      or exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'scout'
          and coalesce(u.scout_verification_status, 'none') = 'approved'
      )
    );
$$;

comment on function public.goalnova_scout_player_profiles_by_ids(uuid[]) is
  'Scout/staff safe player profiles with derived is_player_premium (no stripe/referral/subscription columns).';

revoke all on function public.goalnova_public_player_profile_row(uuid) from public;
grant execute on function public.goalnova_public_player_profile_row(uuid) to anon, authenticated;

revoke all on function public.goalnova_public_player_profile_by_username(text) from public;
grant execute on function public.goalnova_public_player_profile_by_username(text) to anon, authenticated;

revoke all on function public.goalnova_public_player_profiles_by_ids(uuid[]) from public;
grant execute on function public.goalnova_public_player_profiles_by_ids(uuid[]) to anon, authenticated;

revoke all on function public.goalnova_public_player_profiles_discover(int) from public;
grant execute on function public.goalnova_public_player_profiles_discover(int) to anon, authenticated;

revoke all on function public.goalnova_public_player_profiles_search(
  text, text, text, text, int, int, text, text, int
) from public;
grant execute on function public.goalnova_public_player_profiles_search(
  text, text, text, text, int, int, text, text, int
) to anon, authenticated;

revoke all on function public.goalnova_scout_player_profiles_by_ids(uuid[]) from public;
grant execute on function public.goalnova_scout_player_profiles_by_ids(uuid[]) to authenticated;

-- ===========================================================================
-- public.player_profiles
-- SENSITIVE on full row: stripe_customer_id, stripe_subscription_id, referred_by,
-- referral_code, subscription_plan, subscription_status, subscription_current_period_end.
-- No phone/email/birthdate columns on this table (email lives on public.users).
-- Other users: goalnova_public_player_profile_row / _by_ids / _discover RPCs only.
-- Scout sorting: goalnova_scout_player_profiles_by_ids (derived is_player_premium).
-- ===========================================================================
alter table public.player_profiles enable row level security;

drop policy if exists "player_profiles_select_active" on public.player_profiles;

drop policy if exists "player_profiles_select_own" on public.player_profiles;
create policy "player_profiles_select_own"
  on public.player_profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "player_profiles_select_staff" on public.player_profiles;
create policy "player_profiles_select_staff"
  on public.player_profiles
  for select
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

drop policy if exists "player_profiles_insert_own" on public.player_profiles;
create policy "player_profiles_insert_own"
  on public.player_profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "player_profiles_update_own" on public.player_profiles;
create policy "player_profiles_update_own"
  on public.player_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke select on table public.player_profiles from anon;
grant select on table public.player_profiles to authenticated;
grant insert, update on table public.player_profiles to authenticated;

-- Public follow counts (no follow row exposure; target user must be active).
create or replace function public.goalnova_public_follow_counts(p_user_id uuid)
returns table (
  followers_count int,
  following_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when public.goalnova_user_is_active(p_user_id) then (
        select count(*)::int
        from public.follows f
        where f.following_id = p_user_id
      )
      else 0
    end as followers_count,
    case
      when public.goalnova_user_is_active(p_user_id) then (
        select count(*)::int
        from public.follows f
        where f.follower_id = p_user_id
      )
      else 0
    end as following_count;
$$;

comment on function public.goalnova_public_follow_counts(uuid) is
  'Public-safe follower/following counts for an active user (no follow graph rows).';

revoke all on function public.goalnova_public_follow_counts(uuid) from public;
grant execute on function public.goalnova_public_follow_counts(uuid) to anon, authenticated;

-- ===========================================================================
-- public.follows — graph visible to signed-in users only
-- ===========================================================================
alter table public.follows enable row level security;

drop policy if exists "follows_select_public" on public.follows;
drop policy if exists "follows_select_authenticated" on public.follows;
create policy "follows_select_authenticated"
  on public.follows
  for select
  to authenticated
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

revoke select on table public.follows from anon;
grant select on table public.follows to authenticated;
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
    nullif(trim(u.avatar_url), '')::text as avatar_url,
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
-- Schema note: no status, visibility, is_public, is_deleted, or moderation_status
-- columns on public.videos — public feed gate is playable URL + active owner.
-- ===========================================================================
alter table public.videos enable row level security;

drop policy if exists "videos_select_public" on public.videos;

drop policy if exists "videos_select_explore_public" on public.videos;
create policy "videos_select_explore_public"
  on public.videos
  for select
  to anon, authenticated
  using (
    public.goalnova_video_has_playable_url(videos)
    and public.goalnova_user_is_active(videos.user_id)
  );

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
  using (
    exists (
      select 1
      from public.challenges c
      where c.id = challenge_entries.challenge_id
        and c.status in ('active', 'ended')
    )
    and exists (
      select 1
      from public.videos v
      where v.id = challenge_entries.video_id
        and public.goalnova_video_has_playable_url(v)
        and public.goalnova_user_is_active(v.user_id)
    )
  );

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

drop policy if exists "challenges_delete_staff" on public.challenges;
create policy "challenges_delete_staff"
  on public.challenges
  for delete
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

grant select on table public.challenges to anon, authenticated;
grant insert, update, delete on table public.challenges to authenticated;

-- Safe public AI score projection (no feedback_text, visibility_analysis, or full rows).
create or replace function public.goalnova_public_ai_scores_for_videos(p_video_ids uuid[])
returns table (
  video_id uuid,
  overall_score double precision,
  created_at timestamptz,
  valid_for_football_analysis boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.video_id,
    a.overall_score,
    a.created_at,
    coalesce(a.valid_for_football_analysis, true) as valid_for_football_analysis
  from public.ai_analyses a
  inner join public.videos v on v.id = a.video_id
  where p_video_ids is not null
    and cardinality(p_video_ids) > 0
    and a.video_id = any (p_video_ids)
    and coalesce(a.valid_for_football_analysis, true) = true
    and public.goalnova_video_has_playable_url(v)
    and public.goalnova_user_is_active(v.user_id);
$$;

comment on function public.goalnova_public_ai_scores_for_videos(uuid[]) is
  'Public-safe AI scores for playable videos with active owners (no feedback/visibility JSON).';

create or replace function public.goalnova_public_top_rated_ai_videos(p_limit int default 180)
returns table (
  video_id uuid,
  overall_score double precision,
  created_at timestamptz,
  valid_for_football_analysis boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.video_id,
    a.overall_score,
    a.created_at,
    coalesce(a.valid_for_football_analysis, true) as valid_for_football_analysis
  from public.ai_analyses a
  inner join public.videos v on v.id = a.video_id
  where coalesce(a.valid_for_football_analysis, true) = true
    and public.goalnova_video_has_playable_url(v)
    and public.goalnova_user_is_active(v.user_id)
  order by a.overall_score desc nulls last, a.created_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 180), 500));
$$;

comment on function public.goalnova_public_top_rated_ai_videos(int) is
  'Public-safe top-rated AI videos (scores only; playable URL + active owner).';

revoke all on function public.goalnova_public_ai_scores_for_videos(uuid[]) from public;
grant execute on function public.goalnova_public_ai_scores_for_videos(uuid[]) to anon, authenticated;

revoke all on function public.goalnova_public_top_rated_ai_videos(int) from public;
grant execute on function public.goalnova_public_top_rated_ai_videos(int) to anon, authenticated;

-- ===========================================================================
-- public.ai_analyses — no anon SELECT on full rows
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

drop policy if exists "ai_analyses_select_public_challenge_videos" on public.ai_analyses;
drop policy if exists "ai_analyses_select_public_playable_videos" on public.ai_analyses;

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

drop policy if exists "ai_analyses_select_staff" on public.ai_analyses;
create policy "ai_analyses_select_staff"
  on public.ai_analyses
  for select
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

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

revoke select on table public.ai_analyses from anon;
grant select, insert, update on table public.ai_analyses to authenticated;

-- ===========================================================================
-- public.video_processing_jobs — service role only (no client policies)
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
