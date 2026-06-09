-- Player search RPC for /search, /explore, /discover (run in SQL Editor if not in core RLS migration yet).

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

revoke all on function public.goalnova_public_player_profiles_search(
  text, text, text, text, int, int, text, text, int
) from public;
grant execute on function public.goalnova_public_player_profiles_search(
  text, text, text, text, int, int, text, text, int
) to anon, authenticated;
