-- =============================================================================
-- PASTE u Supabase SQL Editor (cijeli file odjednom).
-- Uključuje mjesečni kviz + breakdown po tjednima (sve u jednom).
-- Sigurno za ponovni run: CREATE OR REPLACE.
-- =============================================================================

-- --- Part 1: Monthly bounds, XP, rank, leaderboard -------------------------

create or replace function public.goalnova_quiz_zagreb_month_bounds(p_date date)
returns table (month_start date, month_end date)
language sql
stable
as $$
  select
    date_trunc('month', p_date)::date as month_start,
    (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date as month_end;
$$;

create or replace function public.goalnova_quiz_monthly_xp(p_user_id uuid, p_date date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select month_start, month_end
    from public.goalnova_quiz_zagreb_month_bounds(p_date)
  )
  select coalesce(sum(a.xp_awarded), 0)::int
  from public.quiz_user_answers a
  cross join bounds b
  where a.user_id = p_user_id
    and a.quiz_date between b.month_start and b.month_end;
$$;

create or replace function public.goalnova_quiz_monthly_rank(p_user_id uuid, p_date date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select month_start, month_end
    from public.goalnova_quiz_zagreb_month_bounds(p_date)
  ),
  monthly as (
    select
      a.user_id,
      sum(a.xp_awarded)::bigint as monthly_xp
    from public.quiz_user_answers a
    cross join bounds b
    where a.quiz_date between b.month_start and b.month_end
    group by a.user_id
  ),
  my_monthly as (
    select coalesce(m.monthly_xp, 0) as monthly_xp
    from (select p_user_id as user_id) u
    left join monthly m on m.user_id = u.user_id
  ),
  participant_count as (
    select count(*)::int as cnt from monthly
  ),
  ranked as (
    select
      user_id,
      rank() over (order by monthly_xp desc, user_id asc) as rnk
    from monthly
    where monthly_xp > 0
  )
  select case
    when (select monthly_xp from my_monthly) > 0 then
      coalesce((select rnk::int from ranked where user_id = p_user_id), 0)
    when (select monthly_xp from my_monthly) = 0
      and (select cnt from participant_count) = 1
      and exists (select 1 from monthly where user_id = p_user_id) then
      1
    else 0
  end;
$$;

create or replace function public.goalnova_quiz_monthly_leaderboard(
  p_locale text default 'en',
  p_limit int default 10
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  username text,
  country text,
  monthly_xp bigint
)
language sql
volatile
security definer
set search_path = public
as $$
  with bounds as (
    select month_start, month_end
    from public.goalnova_quiz_zagreb_month_bounds(public.goalnova_quiz_zagreb_today())
  ),
  monthly as (
    select
      a.user_id,
      sum(a.xp_awarded)::bigint as monthly_xp
    from public.quiz_user_answers a
    cross join bounds b
    where a.quiz_date between b.month_start and b.month_end
    group by a.user_id
  ),
  ranked as (
    select
      rank() over (order by m.monthly_xp desc, m.user_id asc) as rank,
      m.user_id,
      coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player') as display_name,
      coalesce(nullif(trim(pp.username), ''), '') as username,
      nullif(trim(pp.country), '') as country,
      m.monthly_xp
    from monthly m
    left join public.player_profiles pp on pp.id = m.user_id
    where m.monthly_xp > 0
  )
  select rank, user_id, display_name, username, country, monthly_xp
  from ranked
  order by rank asc
  limit greatest(least(coalesce(p_limit, 10), 50), 1);
$$;

-- --- Part 2: Weekly breakdown within month -----------------------------------

create or replace function public.goalnova_quiz_monthly_week_breakdown(p_user_id uuid, p_date date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select month_start, month_end
    from public.goalnova_quiz_zagreb_month_bounds(p_date)
  ),
  week_starts as (
    select
      d::date as week_start,
      (d::date + 6) as week_end
    from bounds b,
    lateral generate_series(
      (b.month_start - ((extract(isodow from b.month_start)::int + 6) % 7))::timestamp,
      b.month_end::timestamp,
      interval '7 days'
    ) as d
  ),
  weeks_in_month as (
    select
      row_number() over (order by ws.week_start) as week_index,
      greatest(ws.week_start, b.month_start) as period_start,
      least(ws.week_end, b.month_end) as period_end,
      ws.week_start,
      ws.week_end
    from week_starts ws
    cross join bounds b
    where ws.week_start <= b.month_end
      and ws.week_end >= b.month_start
  ),
  with_xp as (
    select
      w.week_index,
      w.week_start,
      w.week_end,
      coalesce((
        select sum(a.xp_awarded)::int
        from public.quiz_user_answers a
        where a.user_id = p_user_id
          and a.quiz_date between w.period_start and w.period_end
      ), 0) as xp
    from weeks_in_month w
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'week_index', week_index,
        'week_start', week_start,
        'week_end', week_end,
        'xp', xp
      )
      order by week_index
    ),
    '[]'::jsonb
  )
  from with_xp;
$$;

-- --- Part 3: RPC payloads (get_today + submit_answer) ------------------------

create or replace function public.goalnova_quiz_get_today(p_locale text default 'en')
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_locale text := public.goalnova_quiz_normalize_locale(p_locale);
  v_uid uuid := auth.uid();
  v_date date := public.goalnova_quiz_zagreb_today();
  v_qid uuid;
  v_q record;
  v_answer record;
  v_viewer record;
  v_has_answered boolean := false;
  v_options text[];
  v_result jsonb;
begin
  v_qid := public.goalnova_quiz_pick_question_id(v_date);
  if v_qid is null then
    return jsonb_build_object(
      'locale', v_locale,
      'quiz_date', v_date,
      'error', 'no_questions'
    );
  end if;

  select id, category, question_text, options, correct_option_index
  into v_q
  from public.quiz_questions
  where id = v_qid;

  v_options := public.goalnova_quiz_localized_options(v_q.options, v_locale);

  v_result := jsonb_build_object(
    'locale', v_locale,
    'quiz_date', v_date,
    'question', jsonb_build_object(
      'id', v_q.id,
      'category', v_q.category,
      'question_text', public.goalnova_quiz_localized_text(v_q.question_text, v_locale),
      'options', to_jsonb(v_options)
    ),
    'already_answered', false,
    'answer', null
  );

  if v_uid is null then
    return v_result;
  end if;

  select
    selected_option_index,
    is_correct,
    xp_awarded
  into v_answer
  from public.quiz_user_answers
  where user_id = v_uid
    and quiz_date = v_date
  limit 1;
  v_has_answered := found;

  select
    coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player') as display_name,
    coalesce(nullif(trim(pp.username), ''), '') as username,
    nullif(trim(pp.country), '') as country
  into v_viewer
  from public.player_profiles pp
  where pp.id = v_uid;

  v_result := v_result || jsonb_build_object(
    'current_streak', public.goalnova_quiz_compute_streak(v_uid, v_date),
    'total_quiz_xp', public.goalnova_quiz_total_xp(v_uid),
    'weekly_xp', public.goalnova_quiz_weekly_xp(v_uid, v_date),
    'weekly_rank', public.goalnova_quiz_weekly_rank(v_uid, v_date),
    'monthly_xp', public.goalnova_quiz_monthly_xp(v_uid, v_date),
    'monthly_rank', public.goalnova_quiz_monthly_rank(v_uid, v_date),
    'monthly_weeks', public.goalnova_quiz_monthly_week_breakdown(v_uid, v_date),
    'viewer', jsonb_build_object(
      'display_name', coalesce(v_viewer.display_name, 'Player'),
      'username', coalesce(v_viewer.username, ''),
      'country', v_viewer.country
    )
  );

  if v_has_answered then
    v_result := v_result || jsonb_build_object(
      'already_answered', true,
      'answer', jsonb_build_object(
        'selected_option_index', v_answer.selected_option_index,
        'is_correct', v_answer.is_correct,
        'xp_awarded', v_answer.xp_awarded,
        'correct_option_index', v_q.correct_option_index,
        'correct_option_text', (public.goalnova_quiz_localized_options(v_q.options, v_locale))[v_q.correct_option_index + 1]
      )
    );
  end if;

  return v_result;
end;
$$;

create or replace function public.goalnova_quiz_submit_answer(
  p_selected_option_index smallint,
  p_locale text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locale text := public.goalnova_quiz_normalize_locale(p_locale);
  v_uid uuid := auth.uid();
  v_date date := public.goalnova_quiz_zagreb_today();
  v_qid uuid;
  v_q record;
  v_is_correct boolean;
  v_streak_before int;
  v_streak_after int;
  v_xp int := 0;
  v_bonus boolean := false;
  v_correct_text text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_selected_option_index < 0 or p_selected_option_index > 3 then
    raise exception 'Invalid option index';
  end if;

  if exists (
    select 1 from public.quiz_user_answers
    where user_id = v_uid and quiz_date = v_date
  ) then
    raise exception 'already_answered';
  end if;

  v_qid := public.goalnova_quiz_pick_question_id(v_date);
  if v_qid is null then
    raise exception 'no_questions';
  end if;

  select id, options, correct_option_index
  into v_q
  from public.quiz_questions
  where id = v_qid;

  v_is_correct := (p_selected_option_index = v_q.correct_option_index);
  v_streak_before := public.goalnova_quiz_compute_streak(v_uid, v_date - 1);

  if v_is_correct then
    v_xp := 10;
    v_streak_after := v_streak_before + 1;
    if v_streak_after > 0 and mod(v_streak_after, 7) = 0 then
      v_xp := v_xp + 25;
      v_bonus := true;
    end if;
  else
    v_streak_after := 0;
  end if;

  insert into public.quiz_user_answers (
    user_id,
    quiz_date,
    question_id,
    selected_option_index,
    is_correct,
    xp_awarded
  ) values (
    v_uid,
    v_date,
    v_q.id,
    p_selected_option_index,
    v_is_correct,
    v_xp
  );

  v_correct_text := (public.goalnova_quiz_localized_options(v_q.options, v_locale))[v_q.correct_option_index + 1];

  return jsonb_build_object(
    'locale', v_locale,
    'quiz_date', v_date,
    'is_correct', v_is_correct,
    'xp_awarded', v_xp,
    'selected_option_index', p_selected_option_index,
    'correct_option_index', v_q.correct_option_index,
    'correct_option_text', v_correct_text,
    'current_streak', public.goalnova_quiz_compute_streak(v_uid, v_date),
    'total_quiz_xp', public.goalnova_quiz_total_xp(v_uid),
    'weekly_xp', public.goalnova_quiz_weekly_xp(v_uid, v_date),
    'weekly_rank', public.goalnova_quiz_weekly_rank(v_uid, v_date),
    'monthly_xp', public.goalnova_quiz_monthly_xp(v_uid, v_date),
    'monthly_rank', public.goalnova_quiz_monthly_rank(v_uid, v_date),
    'monthly_weeks', public.goalnova_quiz_monthly_week_breakdown(v_uid, v_date),
    'streak_bonus_awarded', v_bonus
  );
end;
$$;

revoke all on function public.goalnova_quiz_zagreb_month_bounds(date) from public;
revoke all on function public.goalnova_quiz_monthly_xp(uuid, date) from public;
revoke all on function public.goalnova_quiz_monthly_rank(uuid, date) from public;
revoke all on function public.goalnova_quiz_monthly_week_breakdown(uuid, date) from public;

grant execute on function public.goalnova_quiz_get_today(text) to anon, authenticated;
grant execute on function public.goalnova_quiz_submit_answer(smallint, text) to authenticated;
grant execute on function public.goalnova_quiz_monthly_leaderboard(text, int) to authenticated;
