-- Daily Football Quiz — schema, helpers, RPC (seed in 20260610120001_daily_quiz_seed.sql).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in (
      'world_cup',
      'champions_league',
      'football_rules',
      'legends',
      'current_football'
    )),
  question_text jsonb not null,
  options jsonb not null,
  correct_option_index smallint not null
    check (correct_option_index between 0 and 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint quiz_questions_question_text_en
    check (
      question_text ? 'en'
      and jsonb_typeof(question_text -> 'en') = 'string'
      and length(trim(question_text ->> 'en')) > 0
    ),
  constraint quiz_questions_options_en
    check (
      options ? 'en'
      and jsonb_typeof(options -> 'en') = 'array'
      and jsonb_array_length(options -> 'en') = 4
    )
);

create index if not exists quiz_questions_active_id_idx
  on public.quiz_questions (id)
  where is_active = true;

create table if not exists public.quiz_user_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_date date not null,
  question_id uuid not null references public.quiz_questions (id),
  selected_option_index smallint not null
    check (selected_option_index between 0 and 3),
  is_correct boolean not null,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  answered_at timestamptz not null default now(),
  constraint quiz_user_answers_one_per_day unique (user_id, quiz_date)
);

create index if not exists quiz_user_answers_user_date_idx
  on public.quiz_user_answers (user_id, quiz_date desc);

create index if not exists quiz_user_answers_quiz_date_xp_idx
  on public.quiz_user_answers (quiz_date, xp_awarded);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.quiz_questions enable row level security;
alter table public.quiz_user_answers enable row level security;

drop policy if exists "quiz_user_answers_select_own" on public.quiz_user_answers;
create policy "quiz_user_answers_select_own"
  on public.quiz_user_answers
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Locale helpers
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_quiz_normalize_locale(p_locale text)
returns text
language plpgsql
immutable
as $$
declare
  v text := lower(trim(coalesce(p_locale, '')));
begin
  if v in (
    'en', 'hr', 'de', 'bs', 'es', 'pt', 'sr', 'fr', 'it', 'nl', 'tr', 'ar'
  ) then
    return v;
  end if;
  return 'en';
end;
$$;

create or replace function public.goalnova_quiz_localized_text(p_jsonb jsonb, p_locale text)
returns text
language plpgsql
stable
as $$
declare
  v_locale text := public.goalnova_quiz_normalize_locale(p_locale);
  v text;
begin
  if p_jsonb is null then
    return '';
  end if;
  v := nullif(trim(p_jsonb ->> v_locale), '');
  if v is not null then
    return v;
  end if;
  v := nullif(trim(p_jsonb ->> 'en'), '');
  if v is not null then
    return v;
  end if;
  select nullif(trim(value), '')
  into v
  from jsonb_each_text(p_jsonb)
  limit 1;
  return coalesce(v, '');
end;
$$;

create or replace function public.goalnova_quiz_localized_options(p_jsonb jsonb, p_locale text)
returns text[]
language plpgsql
stable
as $$
declare
  v_locale text := public.goalnova_quiz_normalize_locale(p_locale);
  v_arr jsonb;
  v_out text[] := array[]::text[];
  i int;
begin
  if p_jsonb is null then
    return array['', '', '', ''];
  end if;
  v_arr := p_jsonb -> v_locale;
  if v_arr is null or jsonb_typeof(v_arr) <> 'array' or jsonb_array_length(v_arr) <> 4 then
    v_arr := p_jsonb -> 'en';
  end if;
  if v_arr is null or jsonb_typeof(v_arr) <> 'array' or jsonb_array_length(v_arr) <> 4 then
    return array['', '', '', ''];
  end if;
  for i in 0..3 loop
    v_out := array_append(v_out, coalesce(v_arr ->> i, ''));
  end loop;
  return v_out;
end;
$$;

-- ---------------------------------------------------------------------------
-- Date / rotation (Europe/Zagreb, anchor 2025-01-01)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_quiz_zagreb_today()
returns date
language sql
stable
as $$
  select (timezone('Europe/Zagreb', now()))::date;
$$;

create or replace function public.goalnova_quiz_zagreb_week_bounds(p_date date)
returns table (week_start date, week_end date)
language sql
stable
as $$
  select
    (p_date - ((extract(isodow from p_date)::int + 6) % 7))::date as week_start,
    (p_date - ((extract(isodow from p_date)::int + 6) % 7) + 6)::date as week_end;
$$;

create or replace function public.goalnova_quiz_pick_question_id(p_date date)
returns uuid
language sql
stable
as $$
  with active as (
    select id, row_number() over (order by id asc) - 1 as idx
    from public.quiz_questions
    where is_active = true
  ),
  picked as (
    select id
    from active
  where idx = (
      (p_date - date '2025-01-01')
      % greatest((select count(*)::int from active), 1)
    )
    limit 1
  )
  select id from picked;
$$;

-- ---------------------------------------------------------------------------
-- Stats from quiz_user_answers
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_quiz_total_xp(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(xp_awarded), 0)::int
  from public.quiz_user_answers
  where user_id = p_user_id;
$$;

create or replace function public.goalnova_quiz_compute_streak(p_user_id uuid, p_as_of_date date)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_streak int := 0;
  v_day date := p_as_of_date;
  v_row record;
begin
  loop
    select is_correct
    into v_row
    from public.quiz_user_answers
    where user_id = p_user_id
      and quiz_date = v_day
    limit 1;
    if not found or v_row.is_correct is distinct from true then
      exit;
    end if;
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;
  return v_streak;
end;
$$;

create or replace function public.goalnova_quiz_weekly_xp(p_user_id uuid, p_date date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select week_start, week_end
    from public.goalnova_quiz_zagreb_week_bounds(p_date)
  )
  select coalesce(sum(a.xp_awarded), 0)::int
  from public.quiz_user_answers a
  cross join bounds b
  where a.user_id = p_user_id
    and a.quiz_date between b.week_start and b.week_end;
$$;

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

-- ---------------------------------------------------------------------------
-- RPC: get today
-- ---------------------------------------------------------------------------
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

  if found then
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

-- ---------------------------------------------------------------------------
-- RPC: submit answer
-- ---------------------------------------------------------------------------
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
    'streak_bonus_awarded', v_bonus
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: weekly leaderboard
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.goalnova_quiz_normalize_locale(text) from public;
revoke all on function public.goalnova_quiz_localized_text(jsonb, text) from public;
revoke all on function public.goalnova_quiz_localized_options(jsonb, text) from public;
revoke all on function public.goalnova_quiz_zagreb_today() from public;
revoke all on function public.goalnova_quiz_zagreb_week_bounds(date) from public;
revoke all on function public.goalnova_quiz_pick_question_id(date) from public;
revoke all on function public.goalnova_quiz_total_xp(uuid) from public;
revoke all on function public.goalnova_quiz_compute_streak(uuid, date) from public;
revoke all on function public.goalnova_quiz_weekly_xp(uuid, date) from public;
revoke all on function public.goalnova_quiz_weekly_rank(uuid, date) from public;

grant execute on function public.goalnova_quiz_get_today(text) to anon, authenticated;
grant execute on function public.goalnova_quiz_submit_answer(smallint, text) to authenticated;
grant execute on function public.goalnova_quiz_weekly_leaderboard(text, int) to authenticated;
