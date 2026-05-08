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
