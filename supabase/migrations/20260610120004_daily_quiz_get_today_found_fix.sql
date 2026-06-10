-- Fix: goalnova_quiz_get_today used `if found` after player_profiles SELECT, so every
-- user with a profile was marked already_answered (wrong result before playing).

create or replace function public.goalnova_quiz_get_today(p_locale text default 'en')
returns jsonb
language plpgsql
stable
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
