-- Monthly quiz: per-week XP breakdown within calendar month (Europe/Zagreb).

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

revoke all on function public.goalnova_quiz_monthly_week_breakdown(uuid, date) from public;

-- Extend get_today + submit_answer payloads with monthly week breakdown.
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

grant execute on function public.goalnova_quiz_get_today(text) to anon, authenticated;
grant execute on function public.goalnova_quiz_submit_answer(smallint, text) to authenticated;
