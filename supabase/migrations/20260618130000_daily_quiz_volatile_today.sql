-- Fix: goalnova_quiz_zagreb_today() was STABLE while calling now().
-- In a reused transaction/connection, "today" can stay pinned to the previous day,
-- so the daily question never rotates.

create or replace function public.goalnova_quiz_zagreb_today()
returns date
language sql
volatile
as $$
  select (timezone('Europe/Zagreb', now()))::date;
$$;

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

create or replace function public.goalnova_quiz_weekly_leaderboard(
  p_locale text default 'en',
  p_limit int default 10
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  username text,
  country text,
  weekly_xp bigint
)
language sql
volatile
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
      nullif(trim(pp.country), '') as country,
      w.weekly_xp
    from weekly w
    left join public.player_profiles pp on pp.id = w.user_id
    where w.weekly_xp > 0
  )
  select rank, user_id, display_name, username, country, weekly_xp
  from ranked
  order by rank asc
  limit greatest(least(coalesce(p_limit, 10), 50), 1);
$$;

grant execute on function public.goalnova_quiz_get_today(text) to anon, authenticated;
grant execute on function public.goalnova_quiz_weekly_leaderboard(text, int) to authenticated;
