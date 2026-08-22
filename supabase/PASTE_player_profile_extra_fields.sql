-- Paste in Supabase SQL Editor → Run (once).
-- Adds missing player profile columns and points public/search RPCs at them.
-- Safe to re-run.

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

notify pgrst, 'reload schema';

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
    coalesce(pp.is_available_for_trials, false) as is_available_for_trials,
    coalesce(pp.is_looking_for_club, false) as is_looking_for_club,
    coalesce(pp.achievements, '{}'::text[]) as achievements,
    coalesce(pp.career_history, '[]'::jsonb) as career_history,
    pp.profile_highlight,
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
    coalesce(pp.is_available_for_trials, false) as is_available_for_trials,
    coalesce(pp.is_looking_for_club, false) as is_looking_for_club,
    coalesce(pp.achievements, '{}'::text[]) as achievements,
    coalesce(pp.career_history, '[]'::jsonb) as career_history,
    pp.profile_highlight,
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
    coalesce(pp.is_available_for_trials, false) as is_available_for_trials,
    coalesce(pp.is_looking_for_club, false) as is_looking_for_club,
    coalesce(pp.achievements, '{}'::text[]) as achievements,
    coalesce(pp.career_history, '[]'::jsonb) as career_history,
    pp.profile_highlight,
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
    coalesce(pp.is_available_for_trials, false) as is_available_for_trials,
    coalesce(pp.is_looking_for_club, false) as is_looking_for_club,
    coalesce(pp.achievements, '{}'::text[]) as achievements,
    coalesce(pp.career_history, '[]'::jsonb) as career_history,
    pp.profile_highlight,
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
    coalesce(pp.is_available_for_trials, false) as is_available_for_trials,
    coalesce(pp.is_looking_for_club, false) as is_looking_for_club,
    coalesce(pp.achievements, '{}'::text[]) as achievements,
    coalesce(pp.career_history, '[]'::jsonb) as career_history,
    pp.profile_highlight,
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

revoke all on function public.goalnova_public_player_profiles_search(
  text, text, text, text, int, int, text, text, int
) from public;
grant execute on function public.goalnova_public_player_profiles_search(
  text, text, text, text, int, int, text, text, int
) to anon, authenticated;

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
    coalesce(pp.is_available_for_trials, false) as is_available_for_trials,
    coalesce(pp.is_looking_for_club, false) as is_looking_for_club,
    coalesce(pp.achievements, '{}'::text[]) as achievements,
    coalesce(pp.career_history, '[]'::jsonb) as career_history,
    pp.profile_highlight,
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

