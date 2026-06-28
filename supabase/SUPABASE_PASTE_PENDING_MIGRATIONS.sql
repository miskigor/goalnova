-- =============================================================================
-- PITCHRUSCH / GOALNOVA — PENDING SUPABASE MIGRATIONS (paste all at once)
-- =============================================================================
-- Where: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- Order: Part 1 (quiz monthly) then Part 2 (clubs) — safe to run together.
-- File: supabase/SUPABASE_PASTE_PENDING_MIGRATIONS.sql
-- =============================================================================

-- =============================================================================
-- PART 1: DAILY QUIZ — MONTHLY REPORT
-- =============================================================================

-- Monthly quiz stats and leaderboard (Europe/Zagreb calendar month).

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
    'streak_bonus_awarded', v_bonus
  );
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

revoke all on function public.goalnova_quiz_zagreb_month_bounds(date) from public;
revoke all on function public.goalnova_quiz_monthly_xp(uuid, date) from public;
revoke all on function public.goalnova_quiz_monthly_rank(uuid, date) from public;

grant execute on function public.goalnova_quiz_get_today(text) to anon, authenticated;
grant execute on function public.goalnova_quiz_submit_answer(smallint, text) to authenticated;
grant execute on function public.goalnova_quiz_monthly_leaderboard(text, int) to authenticated;

-- =============================================================================
-- PART 2: CLUB PARTNERSHIP SYSTEM
-- =============================================================================

-- Club Partnership System: clubs, memberships, partnerships, rankings, premium sync.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.club_partnership_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.club_membership_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  cover_url text,
  country text,
  city text,
  website text,
  instagram text,
  description text,
  club_code text not null,
  verified_partner boolean not null default false,
  partnership_status public.club_partnership_status not null default 'pending',
  minimum_players_required int not null default 20,
  partnership_agreement_accepted_at timestamptz,
  coach_user_id uuid references auth.users (id) on delete set null,
  contact_person text,
  contact_email text,
  approved_player_count int not null default 0,
  total_xp bigint not null default 0,
  total_videos int not null default 0,
  challenge_wins int not null default 0,
  club_score bigint not null default 0,
  global_rank int,
  showcase_public boolean not null default false,
  showcase_created_at timestamptz,
  suspended_at timestamptz,
  premium_grace_until timestamptz,
  last_monthly_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubs_slug_unique unique (slug),
  constraint clubs_club_code_unique unique (club_code),
  constraint clubs_club_code_format check (club_code ~ '^[A-Z0-9]{4,32}$')
);

create index if not exists clubs_partnership_status_idx on public.clubs (partnership_status);
create index if not exists clubs_club_score_idx on public.clubs (club_score desc);
create index if not exists clubs_country_idx on public.clubs (country);

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.club_membership_status not null default 'pending',
  is_admin boolean not null default false,
  joined_via_code text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_memberships_unique unique (club_id, user_id)
);

create index if not exists club_memberships_user_idx on public.club_memberships (user_id);
create index if not exists club_memberships_club_status_idx on public.club_memberships (club_id, status);

create table if not exists public.club_partnership_requests (
  id uuid primary key default gen_random_uuid(),
  club_name text not null,
  country text,
  contact_person text not null,
  email text not null,
  instagram text,
  website text,
  estimated_players int,
  message text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_club_id uuid references public.clubs (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint club_partnership_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

-- Future-ready stubs
create table if not exists public.club_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  snapshot_month date not null,
  approved_players int not null default 0,
  total_xp bigint not null default 0,
  total_videos int not null default 0,
  challenge_wins int not null default 0,
  created_at timestamptz not null default now(),
  constraint club_analytics_snapshots_unique unique (club_id, snapshot_month)
);

create table if not exists public.club_scout_reviews (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  scout_user_id uuid references auth.users (id) on delete set null,
  player_user_id uuid references auth.users (id) on delete set null,
  rating smallint,
  notes text,
  created_at timestamptz not null default now()
);

-- Player profile club linkage
alter table public.player_profiles
  add column if not exists club_id uuid references public.clubs (id) on delete set null;

alter table public.player_profiles
  add column if not exists club_verified boolean not null default false;

alter table public.player_profiles
  add column if not exists club_premium_club_id uuid references public.clubs (id) on delete set null;

create index if not exists player_profiles_club_id_idx on public.player_profiles (club_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_club_slugify(p_name text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_name, 'club')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.goalnova_club_generate_code(p_name text)
returns text
language plpgsql
as $$
declare
  v_base text;
  v_code text;
  v_try int := 0;
begin
  v_base := upper(regexp_replace(coalesce(p_name, 'CLUB'), '[^A-Z0-9]', '', 'g'));
  if length(v_base) < 4 then
    v_base := v_base || 'CLUB';
  end if;
  v_base := left(v_base, 20);
  loop
    v_try := v_try + 1;
    v_code := v_base || lpad((extract(epoch from now())::bigint % 10000)::text, 4, '0');
    if v_try > 1 then
      v_code := left(v_base, 16) || lpad((random() * 9999)::int::text, 4, '0');
    end if;
    exit when not exists (select 1 from public.clubs c where c.club_code = v_code);
    if v_try > 20 then
      v_code := 'CLUB' || replace(gen_random_uuid()::text, '-', '');
      v_code := left(v_code, 32);
      exit;
    end if;
  end loop;
  return v_code;
end;
$$;

create or replace function public.goalnova_club_member_xp(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((public.goalnova_public_player_profile_gamification(p_user_id)->>'total_xp')::bigint, 0);
$$;

create or replace function public.goalnova_club_member_video_count(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.videos v
  where v.user_id = p_user_id;
$$;

create or replace function public.goalnova_club_member_challenge_wins(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select count(*)::int
    from public.friend_challenges fc
    where fc.status = 'completed'
      and fc.opponent_id is not null
      and fc.challenger_id in (p_user_id, fc.opponent_id)
      and (
        select cs.xp
        from public.challenge_scores cs
        where cs.challenge_id = fc.id and cs.user_id = p_user_id
      ) > coalesce((
        select max(cs2.xp)
        from public.challenge_scores cs2
        where cs2.challenge_id = fc.id and cs2.user_id <> p_user_id
      ), 0)
  ), 0);
$$;

-- ---------------------------------------------------------------------------
-- Stats refresh + global ranking
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_club_refresh_stats(p_club_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_players int := 0;
  v_xp bigint := 0;
  v_videos int := 0;
  v_wins int := 0;
  v_score bigint := 0;
begin
  select
    count(*) filter (where cm.status = 'approved'),
    coalesce(sum(public.goalnova_club_member_xp(cm.user_id)) filter (where cm.status = 'approved'), 0),
    coalesce(sum(public.goalnova_club_member_video_count(cm.user_id)) filter (where cm.status = 'approved'), 0),
    coalesce(sum(public.goalnova_club_member_challenge_wins(cm.user_id)) filter (where cm.status = 'approved'), 0)
  into v_players, v_xp, v_videos, v_wins
  from public.club_memberships cm
  where cm.club_id = p_club_id;

  v_score := v_xp + (v_videos * 5) + (v_wins * 10);

  update public.clubs c
  set
    approved_player_count = v_players,
    total_xp = v_xp,
    total_videos = v_videos,
    challenge_wins = v_wins,
    club_score = v_score,
    updated_at = now(),
    showcase_public = case
      when v_players >= c.minimum_players_required
        and c.partnership_status = 'active'
        and c.verified_partner then true
      else c.showcase_public
    end,
    showcase_created_at = case
      when v_players >= c.minimum_players_required
        and c.partnership_status = 'active'
        and c.verified_partner
        and c.showcase_created_at is null then now()
      else c.showcase_created_at
    end
  where c.id = p_club_id;
end;
$$;

create or replace function public.goalnova_clubs_refresh_all_ranks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clubs c
  set global_rank = ranked.rnk
  from (
    select id, rank() over (order by club_score desc, total_xp desc, id asc) as rnk
    from public.clubs
    where partnership_status = 'active'
      and verified_partner = true
  ) ranked
  where c.id = ranked.id;

  update public.clubs c
  set global_rank = null
  where c.partnership_status is distinct from 'active'
     or c.verified_partner = false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Premium sync for club members
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_club_sync_member_premium(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club record;
  v_membership record;
  v_now timestamptz := now();
  v_end timestamptz;
begin
  select cm.*, c.partnership_status, c.verified_partner, c.premium_grace_until
  into v_membership
  from public.club_memberships cm
  inner join public.clubs c on c.id = cm.club_id
  where cm.user_id = p_user_id
    and cm.status = 'approved'
  order by cm.created_at desc
  limit 1;

  if not found then
    update public.player_profiles pp
    set club_id = null, club_verified = false
    where pp.id = p_user_id;

    if exists (
      select 1 from public.player_profiles pp
      where pp.id = p_user_id
        and pp.club_premium_club_id is not null
        and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = ''
    ) then
      perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);
      update public.player_profiles pp
      set
        subscription_plan = 'free',
        subscription_status = 'inactive',
        subscription_current_period_end = null,
        club_premium_club_id = null
      where pp.id = p_user_id
        and pp.club_premium_club_id is not null
        and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = '';

      update public.users u
      set subscription_plan = 'free', subscription_status = 'inactive',
          subscription_current_period_end = null, is_premium = false
      where u.id = p_user_id
        and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = '';
    end if;
    return;
  end if;

  select * into v_club from public.clubs where id = v_membership.club_id;

  update public.player_profiles pp
  set
    club_id = v_membership.club_id,
    club_verified = (
      v_club.partnership_status = 'active'
      and v_club.verified_partner = true
    )
  where pp.id = p_user_id;

  if v_club.partnership_status = 'active'
     and v_club.verified_partner = true then
    perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);
    v_end := v_now + interval '365 days';
    update public.player_profiles pp
    set
      subscription_plan = 'player_premium',
      subscription_status = 'active',
      subscription_current_period_end = v_end,
      club_premium_club_id = v_club.id
    where pp.id = p_user_id
      and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = '';

    update public.users u
    set
      subscription_plan = 'player_premium',
      subscription_status = 'active',
      subscription_current_period_end = v_end,
      is_premium = true
    where u.id = p_user_id
      and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = '';
  elsif v_club.partnership_status = 'suspended'
        and v_club.premium_grace_until is not null
        and v_club.premium_grace_until > v_now then
    return;
  elsif exists (
    select 1 from public.player_profiles pp
    where pp.id = p_user_id and pp.club_premium_club_id = v_club.id
      and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = ''
  ) then
    perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);
    update public.player_profiles pp
    set subscription_plan = 'free', subscription_status = 'inactive',
        subscription_current_period_end = null, club_premium_club_id = null
    where pp.id = p_user_id;
    update public.users u
    set subscription_plan = 'free', subscription_status = 'inactive',
        subscription_current_period_end = null, is_premium = false
    where u.id = p_user_id
      and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = '';
  end if;
end;
$$;

create or replace function public.goalnova_club_sync_all_member_premiums(p_club_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  for v_user in
    select cm.user_id from public.club_memberships cm
    where cm.club_id = p_club_id and cm.status = 'approved'
  loop
    perform public.goalnova_club_sync_member_premium(v_user);
  end loop;
end;
$$;

create or replace function public.goalnova_club_try_activate_partnership(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club public.clubs%rowtype;
begin
  select * into v_club from public.clubs where id = p_club_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'club_not_found');
  end if;

  perform public.goalnova_club_refresh_stats(p_club_id);
  select * into v_club from public.clubs where id = p_club_id;

  if v_club.approved_player_count >= v_club.minimum_players_required
     and v_club.partnership_agreement_accepted_at is not null then
    update public.clubs
    set
      verified_partner = true,
      partnership_status = 'active',
      suspended_at = null,
      premium_grace_until = null,
      updated_at = now()
    where id = p_club_id;

    perform public.goalnova_club_sync_all_member_premiums(p_club_id);
    perform public.goalnova_club_refresh_stats(p_club_id);
    perform public.goalnova_clubs_refresh_all_ranks();
    return jsonb_build_object('ok', true, 'status', 'active');
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_club.partnership_status,
    'players', v_club.approved_player_count,
    'needs_agreement', v_club.partnership_agreement_accepted_at is null
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Monthly validation
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_clubs_monthly_validation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club record;
  v_videos int;
  v_suspended int := 0;
  v_reactivated int := 0;
begin
  for v_club in select * from public.clubs where partnership_status in ('active', 'suspended')
  loop
    perform public.goalnova_club_refresh_stats(v_club.id);
    select * into v_club from public.clubs where id = v_club.id;

    select count(*)::int into v_videos
    from public.videos v
    inner join public.club_memberships cm on cm.user_id = v.user_id
      and cm.club_id = v_club.id and cm.status = 'approved'
    where v.created_at >= now() - interval '30 days';

    if v_club.partnership_status = 'active'
       and (v_club.approved_player_count < v_club.minimum_players_required or v_videos < 10) then
      update public.clubs
      set
        partnership_status = 'suspended',
        verified_partner = false,
        suspended_at = now(),
        premium_grace_until = now() + interval '30 days',
        updated_at = now()
      where id = v_club.id;
      v_suspended := v_suspended + 1;
    elsif v_club.partnership_status = 'suspended'
          and v_club.approved_player_count >= v_club.minimum_players_required
          and v_videos >= 10
          and v_club.partnership_agreement_accepted_at is not null then
      update public.clubs
      set partnership_status = 'active', verified_partner = true,
          suspended_at = null, premium_grace_until = null, updated_at = now()
      where id = v_club.id;
      perform public.goalnova_club_try_activate_partnership(v_club.id);
      v_reactivated := v_reactivated + 1;
    elsif v_club.partnership_status = 'suspended'
          and v_club.premium_grace_until is not null
          and v_club.premium_grace_until <= now() then
      perform public.goalnova_club_sync_all_member_premiums(v_club.id);
    end if;

    update public.clubs set last_monthly_check_at = now() where id = v_club.id;
  end loop;

  perform public.goalnova_clubs_refresh_all_ranks();
  return jsonb_build_object('suspended', v_suspended, 'reactivated', v_reactivated);
end;
$$;

-- ---------------------------------------------------------------------------
-- Player join / review
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_club_join(
  p_club_id uuid default null,
  p_club_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_club public.clubs%rowtype;
  v_code text := upper(trim(coalesce(p_club_code, '')));
  v_membership_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_club_id is not null then
    select * into v_club from public.clubs where id = p_club_id;
  elsif v_code <> '' then
    select * into v_club from public.clubs where club_code = v_code;
  else
    raise exception 'club_id or club_code required';
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'club_not_found');
  end if;

  if exists (
    select 1 from public.club_memberships cm
    where cm.user_id = v_uid and cm.status in ('pending', 'approved')
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  insert into public.club_memberships (club_id, user_id, status, joined_via_code)
  values (v_club.id, v_uid, 'pending', nullif(v_code, ''))
  on conflict (club_id, user_id) do update
  set status = 'pending', updated_at = now()
  returning id into v_membership_id;

  return jsonb_build_object(
    'ok', true,
    'membership_id', v_membership_id,
    'club_id', v_club.id,
    'club_name', v_club.name,
    'status', 'pending'
  );
end;
$$;

create or replace function public.goalnova_club_review_membership(
  p_membership_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.club_memberships%rowtype;
  v_is_admin boolean := false;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_row from public.club_memberships where id = p_membership_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select exists (
    select 1 from public.club_memberships cm
    where cm.club_id = v_row.club_id and cm.user_id = v_uid
      and cm.status = 'approved' and cm.is_admin = true
  ) or exists (
    select 1 from public.clubs c where c.id = v_row.club_id and c.coach_user_id = v_uid
  ) into v_is_admin;

  if not v_is_admin and public.goalnova_staff_effective_role() is null then
    raise exception 'Forbidden';
  end if;

  update public.club_memberships
  set
    status = case when p_approve then 'approved'::public.club_membership_status else 'rejected'::public.club_membership_status end,
    reviewed_at = now(),
    reviewed_by = v_uid,
    updated_at = now()
  where id = p_membership_id;

  if p_approve then
    perform public.goalnova_club_sync_member_premium(v_row.user_id);
  else
    perform public.goalnova_club_sync_member_premium(v_row.user_id);
  end if;

  perform public.goalnova_club_refresh_stats(v_row.club_id);
  perform public.goalnova_club_try_activate_partnership(v_row.club_id);
  perform public.goalnova_clubs_refresh_all_ranks();

  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end);
end;
$$;

create or replace function public.goalnova_club_accept_partnership_agreement(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if not exists (
    select 1 from public.club_memberships cm
    where cm.club_id = p_club_id and cm.user_id = v_uid
      and cm.status = 'approved' and cm.is_admin = true
  ) and not exists (
    select 1 from public.clubs c where c.id = p_club_id and c.coach_user_id = v_uid
  ) and public.goalnova_staff_effective_role() is null then
    raise exception 'Forbidden';
  end if;

  update public.clubs
  set partnership_agreement_accepted_at = now(), updated_at = now()
  where id = p_club_id;

  return public.goalnova_club_try_activate_partnership(p_club_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Public reads
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_clubs_list_public(
  p_search text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  cover_url text,
  country text,
  city text,
  club_code text,
  verified_partner boolean,
  partnership_status public.club_partnership_status,
  approved_player_count int,
  total_xp bigint,
  total_videos int,
  club_score bigint,
  global_rank int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.name, c.slug, c.logo_url, c.cover_url, c.country, c.city, c.club_code,
    c.verified_partner, c.partnership_status, c.approved_player_count,
    c.total_xp, c.total_videos, c.club_score, c.global_rank
  from public.clubs c
  where (
    coalesce(trim(p_search), '') = ''
    or c.name ilike '%' || trim(p_search) || '%'
    or coalesce(c.country, '') ilike '%' || trim(p_search) || '%'
    or coalesce(c.city, '') ilike '%' || trim(p_search) || '%'
  )
  order by
    case when c.partnership_status = 'active' and c.verified_partner then 0 else 1 end,
    c.club_score desc,
    c.approved_player_count desc,
    c.name asc
  limit greatest(least(coalesce(p_limit, 24), 100), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.goalnova_club_get_public(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_club public.clubs%rowtype;
  v_top_players jsonb;
  v_recent_videos jsonb;
begin
  select * into v_club
  from public.clubs c
  where c.slug = trim(p_slug)
     or c.club_code = upper(trim(p_slug))
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(jsonb_agg(row_to_json(tp) order by tp.xp desc), '[]'::jsonb)
  into v_top_players
  from (
    select
      pp.id as user_id,
      coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player') as display_name,
      coalesce(nullif(trim(pp.username), ''), '') as username,
      nullif(trim(pp.country), '') as country,
      nullif(trim(u.avatar_url), '') as avatar_url,
      public.goalnova_club_member_xp(cm.user_id) as xp,
      pp.club_verified
    from public.club_memberships cm
    inner join public.player_profiles pp on pp.id = cm.user_id
    inner join public.users u on u.id = cm.user_id
    where cm.club_id = v_club.id and cm.status = 'approved'
    order by xp desc
    limit 12
  ) tp;

  select coalesce(jsonb_agg(row_to_json(rv) order by rv.created_at desc), '[]'::jsonb)
  into v_recent_videos
  from (
    select v.id, v.caption as title, v.thumbnail_url, v.created_at, v.user_id
    from public.videos v
    inner join public.club_memberships cm on cm.user_id = v.user_id
      and cm.club_id = v_club.id and cm.status = 'approved'
    order by v.created_at desc
    limit 8
  ) rv;

  return jsonb_build_object(
    'found', true,
    'club', jsonb_build_object(
      'id', v_club.id,
      'name', v_club.name,
      'slug', v_club.slug,
      'logo_url', v_club.logo_url,
      'cover_url', v_club.cover_url,
      'country', v_club.country,
      'city', v_club.city,
      'website', v_club.website,
      'instagram', v_club.instagram,
      'description', v_club.description,
      'club_code', v_club.club_code,
      'verified_partner', v_club.verified_partner,
      'partnership_status', v_club.partnership_status,
      'approved_player_count', v_club.approved_player_count,
      'total_xp', v_club.total_xp,
      'total_videos', v_club.total_videos,
      'club_score', v_club.club_score,
      'global_rank', v_club.global_rank,
      'showcase_public', v_club.showcase_public,
      'minimum_players_required', v_club.minimum_players_required
    ),
    'top_players', v_top_players,
    'recent_videos', v_recent_videos
  );
end;
$$;

create or replace function public.goalnova_club_rankings_public(p_limit int default 20)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  cover_url text,
  country text,
  city text,
  club_code text,
  verified_partner boolean,
  partnership_status public.club_partnership_status,
  approved_player_count int,
  total_xp bigint,
  total_videos int,
  club_score bigint,
  global_rank int
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.goalnova_clubs_list_public(null, p_limit, 0) listed
  where listed.partnership_status = 'active' and listed.verified_partner = true;
$$;

create or replace function public.goalnova_player_club_badge(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when pp.club_id is null then jsonb_build_object('has_club', false)
    else jsonb_build_object(
      'has_club', true,
      'club_id', c.id,
      'club_name', c.name,
      'club_slug', c.slug,
      'club_verified', pp.club_verified,
      'verified_academy', pp.club_verified and c.verified_partner and c.partnership_status = 'active'
    )
  end
  from public.player_profiles pp
  left join public.clubs c on c.id = pp.club_id
  where pp.id = p_user_id;
$$;

create or replace function public.goalnova_club_dashboard(p_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_club public.clubs%rowtype;
  v_can_admin boolean := false;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_club from public.clubs where id = p_club_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select exists (
    select 1 from public.club_memberships cm
    where cm.club_id = p_club_id and cm.user_id = v_uid
      and cm.status = 'approved' and cm.is_admin = true
  ) or v_club.coach_user_id = v_uid
  or public.goalnova_staff_effective_role() is not null
  into v_can_admin;

  if not v_can_admin then raise exception 'Forbidden'; end if;

  perform public.goalnova_club_refresh_stats(p_club_id);
  select * into v_club from public.clubs where id = p_club_id;

  return jsonb_build_object(
    'ok', true,
    'club', row_to_json(v_club),
    'pending', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', cm.id,
        'user_id', cm.user_id,
        'display_name', coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player'),
        'username', coalesce(nullif(trim(pp.username), ''), ''),
        'country', nullif(trim(pp.country), ''),
        'avatar_url', nullif(trim(u.avatar_url), ''),
        'created_at', cm.created_at
      ) order by cm.created_at asc)
      from public.club_memberships cm
      inner join public.player_profiles pp on pp.id = cm.user_id
      inner join public.users u on u.id = cm.user_id
      where cm.club_id = p_club_id and cm.status = 'pending'
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', cm.id,
        'user_id', cm.user_id,
        'display_name', coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player'),
        'username', coalesce(nullif(trim(pp.username), ''), ''),
        'country', nullif(trim(pp.country), ''),
        'avatar_url', nullif(trim(u.avatar_url), ''),
        'xp', public.goalnova_club_member_xp(cm.user_id),
        'videos', public.goalnova_club_member_video_count(cm.user_id),
        'is_admin', cm.is_admin,
        'created_at', cm.created_at
      ) order by public.goalnova_club_member_xp(cm.user_id) desc)
      from public.club_memberships cm
      inner join public.player_profiles pp on pp.id = cm.user_id
      inner join public.users u on u.id = cm.user_id
      where cm.club_id = p_club_id and cm.status = 'approved'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.goalnova_club_submit_partnership_request(
  p_club_name text,
  p_country text,
  p_contact_person text,
  p_email text,
  p_instagram text default null,
  p_website text default null,
  p_estimated_players int default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.club_partnership_requests (
    club_name, country, contact_person, email, instagram, website, estimated_players, message
  ) values (
    trim(p_club_name), nullif(trim(p_country), ''), trim(p_contact_person), trim(p_email),
    nullif(trim(p_instagram), ''), nullif(trim(p_website), ''), p_estimated_players,
    nullif(trim(p_message), '')
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'request_id', v_id);
end;
$$;

-- Admin: approve partnership request → create club
create or replace function public.goalnova_admin_club_approve_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_req public.club_partnership_requests%rowtype;
  v_slug text;
  v_code text;
  v_club_id uuid;
begin
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then raise exception 'Forbidden'; end if;

  select * into v_req from public.club_partnership_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'already_reviewed'); end if;

  v_slug := public.goalnova_club_slugify(v_req.club_name);
  if exists (select 1 from public.clubs where slug = v_slug) then
    v_slug := v_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  end if;
  v_code := public.goalnova_club_generate_code(v_req.club_name);

  insert into public.clubs (
    name, slug, country, website, instagram, description, club_code,
    contact_person, contact_email, partnership_status
  ) values (
    v_req.club_name, v_slug, v_req.country, v_req.website, v_req.instagram,
    coalesce(v_req.message, ''), v_code, v_req.contact_person, v_req.email, 'pending'
  )
  returning id into v_club_id;

  update public.club_partnership_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), created_club_id = v_club_id
  where id = p_request_id;

  perform public.goalnova_admin_audit_log(
    'club_partnership_request_approved',
    jsonb_build_object('request_id', p_request_id, 'club_id', v_club_id)
  );

  return jsonb_build_object('ok', true, 'club_id', v_club_id, 'club_code', v_code, 'slug', v_slug);
end;
$$;

create or replace function public.goalnova_admin_club_set_status(
  p_club_id uuid,
  p_status public.club_partnership_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then raise exception 'Forbidden'; end if;

  update public.clubs
  set
    partnership_status = p_status,
    verified_partner = case when p_status = 'active' then true else verified_partner end,
    suspended_at = case when p_status = 'suspended' then now() else null end,
    premium_grace_until = case when p_status = 'suspended' then now() + interval '30 days' else null end,
    updated_at = now()
  where id = p_club_id;

  perform public.goalnova_club_sync_all_member_premiums(p_club_id);
  perform public.goalnova_clubs_refresh_all_ranks();

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

create or replace function public.goalnova_admin_clubs_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.goalnova_staff_effective_role() is null then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(c) order by c.created_at desc)
    from public.clubs c
  ), '[]'::jsonb);
end;
$$;

create or replace function public.goalnova_admin_club_requests_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.goalnova_staff_effective_role() is null then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(r) order by r.created_at desc)
    from public.club_partnership_requests r
    where r.status = 'pending'
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.club_partnership_requests enable row level security;
alter table public.club_analytics_snapshots enable row level security;
alter table public.club_scout_reviews enable row level security;

-- No direct table access for anon/authenticated; use RPCs only.
create policy clubs_staff_all on public.clubs
  for all using (public.goalnova_staff_effective_role() is not null);

create policy club_memberships_owner_read on public.club_memberships
  for select using (auth.uid() = user_id);

create policy club_memberships_staff_all on public.club_memberships
  for all using (public.goalnova_staff_effective_role() is not null);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.goalnova_clubs_list_public(text, int, int) to anon, authenticated;
grant execute on function public.goalnova_club_get_public(text) to anon, authenticated;
grant execute on function public.goalnova_club_rankings_public(int) to anon, authenticated;
grant execute on function public.goalnova_player_club_badge(uuid) to anon, authenticated;
grant execute on function public.goalnova_club_join(uuid, text) to authenticated;
grant execute on function public.goalnova_club_review_membership(uuid, boolean) to authenticated;
grant execute on function public.goalnova_club_accept_partnership_agreement(uuid) to authenticated;
grant execute on function public.goalnova_club_dashboard(uuid) to authenticated;
grant execute on function public.goalnova_club_submit_partnership_request(text, text, text, text, text, text, int, text) to anon, authenticated;
grant execute on function public.goalnova_admin_club_approve_request(uuid) to authenticated;
grant execute on function public.goalnova_admin_club_set_status(uuid, public.club_partnership_status) to authenticated;
grant execute on function public.goalnova_admin_clubs_list() to authenticated;
grant execute on function public.goalnova_admin_club_requests_list() to authenticated;
grant execute on function public.goalnova_clubs_monthly_validation() to authenticated;
