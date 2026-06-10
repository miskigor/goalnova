-- Fix weekly rank: 0-XP users no longer all tie at #1; leaderboard excludes 0-XP rows.

create or replace function public.goalnova_quiz_weekly_rank(p_user_id uuid, p_date date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select week_start, week_end
    from public.goalnova_quiz_zagreb_week_bounds(p_date)
  ),
  weekly as (
    select
      a.user_id,
      sum(a.xp_awarded)::bigint as weekly_xp
    from public.quiz_user_answers a
    cross join bounds b
    where a.quiz_date between b.week_start and b.week_end
    group by a.user_id
  ),
  my_weekly as (
    select coalesce(w.weekly_xp, 0) as weekly_xp
    from (select p_user_id as user_id) u
    left join weekly w on w.user_id = u.user_id
  ),
  participant_count as (
    select count(*)::int as cnt from weekly
  ),
  ranked as (
    select
      user_id,
      rank() over (order by weekly_xp desc, user_id asc) as rnk
    from weekly
    where weekly_xp > 0
  )
  select case
    when (select weekly_xp from my_weekly) > 0 then
      coalesce((select rnk::int from ranked where user_id = p_user_id), 0)
    when (select weekly_xp from my_weekly) = 0
      and (select cnt from participant_count) = 1
      and exists (select 1 from weekly where user_id = p_user_id) then
      1
    else 0
  end;
$$;

create or replace function public.goalnova_quiz_weekly_leaderboard(
  p_locale text default 'en',
  p_limit int default 10
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  username text,
  weekly_xp bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select week_start, week_end
    from public.goalnova_quiz_zagreb_week_bounds(public.goalnova_quiz_zagreb_today())
  ),
  weekly as (
    select
      a.user_id,
      sum(a.xp_awarded)::bigint as weekly_xp
    from public.quiz_user_answers a
    cross join bounds b
    where a.quiz_date between b.week_start and b.week_end
    group by a.user_id
  ),
  ranked as (
    select
      rank() over (order by w.weekly_xp desc, w.user_id asc) as rank,
      w.user_id,
      coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player') as display_name,
      coalesce(nullif(trim(pp.username), ''), '') as username,
      w.weekly_xp
    from weekly w
    left join public.player_profiles pp on pp.id = w.user_id
    where w.weekly_xp > 0
  )
  select rank, user_id, display_name, username, weekly_xp
  from ranked
  order by rank asc
  limit greatest(least(coalesce(p_limit, 10), 50), 1);
$$;
