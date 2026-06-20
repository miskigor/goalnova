-- Friend Challenge System: 1v1 XP competition over 7 days (Europe/Zagreb dates).

-- ---------------------------------------------------------------------------
-- Tables (spec: friend_challenges + challenge_scores)
-- ---------------------------------------------------------------------------
create table if not exists public.friend_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users (id) on delete cascade,
  opponent_id uuid null references auth.users (id) on delete set null,
  start_date date null,
  end_date date null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint friend_challenges_distinct_players
    check (opponent_id is null or opponent_id <> challenger_id)
);

create index if not exists friend_challenges_challenger_idx
  on public.friend_challenges (challenger_id, status, created_at desc);

create index if not exists friend_challenges_opponent_idx
  on public.friend_challenges (opponent_id, status, created_at desc)
  where opponent_id is not null;

create table if not exists public.challenge_scores (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.friend_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  constraint challenge_scores_one_per_user unique (challenge_id, user_id)
);

create index if not exists challenge_scores_challenge_user_idx
  on public.challenge_scores (challenge_id, user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.friend_challenges enable row level security;
alter table public.challenge_scores enable row level security;

-- Participants can read their challenges; pending invites readable by id (via RPC only).
drop policy if exists "friend_challenges_select_participant" on public.friend_challenges;
create policy "friend_challenges_select_participant"
  on public.friend_challenges
  for select
  to authenticated
  using (
    challenger_id = auth.uid()
    or opponent_id = auth.uid()
  );

drop policy if exists "challenge_scores_select_participant" on public.challenge_scores;
create policy "challenge_scores_select_participant"
  on public.challenge_scores
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.friend_challenges fc
      where fc.id = challenge_scores.challenge_id
        and (fc.challenger_id = auth.uid() or fc.opponent_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_friend_challenge_zagreb_today()
returns date
language sql
volatile
as $$
  select (timezone('Europe/Zagreb', now()))::date;
$$;

create or replace function public.goalnova_friend_challenge_quiz_xp_in_period(
  p_user_id uuid,
  p_start date,
  p_end date
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(a.xp_awarded), 0)::int
  from public.quiz_user_answers a
  where a.user_id = p_user_id
    and a.quiz_date between p_start and p_end;
$$;

create or replace function public.goalnova_friend_challenge_total_xp(
  p_challenge_id uuid,
  p_user_id uuid,
  p_start date,
  p_end date
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      (select cs.xp from public.challenge_scores cs
       where cs.challenge_id = p_challenge_id and cs.user_id = p_user_id),
      0
    )
    + public.goalnova_friend_challenge_quiz_xp_in_period(p_user_id, p_start, p_end);
$$;

create or replace function public.goalnova_friend_challenge_maybe_complete(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end date;
  v_status text;
begin
  select end_date, status
  into v_end, v_status
  from public.friend_challenges
  where id = p_challenge_id;

  if v_status = 'active'
     and v_end is not null
     and v_end < public.goalnova_friend_challenge_zagreb_today() then
    update public.friend_challenges
    set status = 'completed'
    where id = p_challenge_id;
  end if;
end;
$$;

create or replace function public.goalnova_friend_challenge_player_row(
  p_challenge_id uuid,
  p_user_id uuid,
  p_start date,
  p_end date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user_id', p_user_id,
    'username', coalesce(nullif(trim(pp.username), ''), ''),
    'display_name', coalesce(
      nullif(trim(pp.full_name), ''),
      nullif(trim(pp.username), ''),
      'Player'
    ),
    'bonus_xp', coalesce(
      (select cs.xp from public.challenge_scores cs
       where cs.challenge_id = p_challenge_id and cs.user_id = p_user_id),
      0
    ),
    'quiz_xp', public.goalnova_friend_challenge_quiz_xp_in_period(p_user_id, p_start, p_end),
    'total_xp', public.goalnova_friend_challenge_total_xp(
      p_challenge_id, p_user_id, p_start, p_end
    )
  )
  from public.player_profiles pp
  where pp.id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create invite
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_friend_challenge_create()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_role text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(nullif(trim(role), ''), 'player')
  into v_role
  from public.users
  where id = v_uid;

  if v_role <> 'player' then
    raise exception 'Only players can create friend challenges';
  end if;

  insert into public.friend_challenges (challenger_id, status)
  values (v_uid, 'pending')
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'status', 'pending',
    'challenger_id', v_uid
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: accept invite (+50 XP both)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_friend_challenge_accept(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.friend_challenges%rowtype;
  v_start date := public.goalnova_friend_challenge_zagreb_today();
  v_end date := v_start + 6;
  v_bonus int := 50;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_row
  from public.friend_challenges
  where id = p_challenge_id
  for update;

  if not found then
    raise exception 'Challenge not found';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Challenge is not pending';
  end if;

  if v_row.challenger_id = v_uid then
    raise exception 'Cannot accept your own invite';
  end if;

  if exists (
    select 1
    from public.users u
    where u.id = v_uid
      and coalesce(nullif(trim(u.role), ''), 'player') <> 'player'
  ) then
    raise exception 'Only players can join friend challenges';
  end if;

  update public.friend_challenges
  set
    opponent_id = v_uid,
    start_date = v_start,
    end_date = v_end,
    status = 'active'
  where id = p_challenge_id;

  insert into public.player_profiles (id)
  values (v_row.challenger_id)
  on conflict (id) do nothing;

  insert into public.player_profiles (id)
  values (v_uid)
  on conflict (id) do nothing;

  insert into public.challenge_scores (challenge_id, user_id, xp)
  values
    (p_challenge_id, v_row.challenger_id, v_bonus),
    (p_challenge_id, v_uid, v_bonus)
  on conflict (challenge_id, user_id) do update
  set xp = public.challenge_scores.xp + excluded.xp;

  return public.goalnova_friend_challenge_get(p_challenge_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: get challenge (public via id — no auth required for pending preview)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_friend_challenge_get(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.friend_challenges%rowtype;
  v_viewer uuid := auth.uid();
  v_players jsonb := '[]'::jsonb;
  v_winner uuid;
  v_ranked jsonb;
begin
  select *
  into v_row
  from public.friend_challenges
  where id = p_challenge_id;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  perform public.goalnova_friend_challenge_maybe_complete(p_challenge_id);

  select *
  into v_row
  from public.friend_challenges
  where id = p_challenge_id;

  if v_row.status in ('active', 'completed')
     and v_row.start_date is not null
     and v_row.end_date is not null then
    v_players := jsonb_build_array(
      public.goalnova_friend_challenge_player_row(
        p_challenge_id, v_row.challenger_id, v_row.start_date, v_row.end_date
      ),
      public.goalnova_friend_challenge_player_row(
        p_challenge_id, v_row.opponent_id, v_row.start_date, v_row.end_date
      )
    );

    select elem ->> 'user_id'
    into v_winner
    from (
      select elem, (elem ->> 'total_xp')::int as total_xp
      from jsonb_array_elements(v_players) elem
      order by total_xp desc, elem ->> 'username' asc
      limit 1
    ) w
    where v_row.status = 'completed';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'challenger_id', v_row.challenger_id,
    'opponent_id', v_row.opponent_id,
    'start_date', v_row.start_date,
    'end_date', v_row.end_date,
    'created_at', v_row.created_at,
    'viewer_id', v_viewer,
    'is_challenger', v_viewer is not null and v_viewer = v_row.challenger_id,
    'is_opponent', v_viewer is not null and v_viewer = v_row.opponent_id,
    'is_participant', v_viewer is not null
      and (v_viewer = v_row.challenger_id or v_viewer = v_row.opponent_id),
    'challenger', (
      select jsonb_build_object(
        'user_id', pp.id,
        'username', coalesce(nullif(trim(pp.username), ''), ''),
        'display_name', coalesce(
          nullif(trim(pp.full_name), ''),
          nullif(trim(pp.username), ''),
          'Player'
        )
      )
      from public.player_profiles pp
      where pp.id = v_row.challenger_id
    ),
    'players', (
      select coalesce(jsonb_agg(ranked.elem order by ranked.rnk), '[]'::jsonb)
      from (
        select
          elem || jsonb_build_object('rank', rnk) as elem,
          rnk
        from (
          select
            elem,
            rank() over (
              order by (elem ->> 'total_xp')::int desc, elem ->> 'username' asc
            ) as rnk
          from jsonb_array_elements(v_players) elem
        ) x
      ) ranked
    ),
    'winner_user_id', v_winner
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: list my challenges
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_friend_challenge_list_mine(p_limit int default 10)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select fc.id, fc.created_at
    from public.friend_challenges fc
    where auth.uid() is not null
      and (fc.challenger_id = auth.uid() or fc.opponent_id = auth.uid())
    order by fc.created_at desc
    limit greatest(least(coalesce(p_limit, 10), 50), 1)
  )
  select coalesce(
    jsonb_agg(public.goalnova_friend_challenge_get(m.id) order by m.created_at desc),
    '[]'::jsonb
  )
  from mine m;
$$;

-- Include friend-challenge join bonuses in public profile XP total.
create or replace function public.goalnova_public_player_profile_gamification(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with freestyle_challenge as (
    select c.id as challenge_id
    from public.challenges c
    where c.slug = 'freestyle-challenge'
      and c.status in ('active', 'ended')
    limit 1
  ),
  has_freestyle_badge as (
    select exists (
      select 1
      from public.challenge_entries ce
      join freestyle_challenge fc on fc.challenge_id = ce.challenge_id
      join public.videos v on v.id = ce.video_id
      where ce.user_id = p_user_id
        and public.goalnova_video_has_playable_url(v)
        and public.goalnova_user_is_active(p_user_id)
    ) as earned
  ),
  freestyle_xp as (
    select case when (select earned from has_freestyle_badge) then 75 else 0 end as xp
  ),
  quiz_xp as (
    select public.goalnova_quiz_total_xp(p_user_id) as xp
  ),
  friend_bonus_xp as (
    select coalesce(sum(cs.xp), 0)::int as xp
    from public.challenge_scores cs
    where cs.user_id = p_user_id
  )
  select jsonb_build_object(
    'total_xp',
      (select xp from quiz_xp)
      + (select xp from freestyle_xp)
      + (select xp from friend_bonus_xp),
    'freestyle_badge', (select earned from has_freestyle_badge)
  );
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.goalnova_friend_challenge_zagreb_today() from public;
revoke all on function public.goalnova_friend_challenge_quiz_xp_in_period(uuid, date, date) from public;
revoke all on function public.goalnova_friend_challenge_total_xp(uuid, uuid, date, date) from public;
revoke all on function public.goalnova_friend_challenge_maybe_complete(uuid) from public;
revoke all on function public.goalnova_friend_challenge_player_row(uuid, uuid, date, date) from public;

grant execute on function public.goalnova_friend_challenge_create() to authenticated;
grant execute on function public.goalnova_friend_challenge_accept(uuid) to authenticated;
grant execute on function public.goalnova_friend_challenge_get(uuid) to anon, authenticated;
grant execute on function public.goalnova_friend_challenge_list_mine(int) to authenticated;
