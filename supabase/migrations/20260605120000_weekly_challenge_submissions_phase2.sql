-- Weekly Challenge Submissions — Phase 2 foundation (no public UI / leaderboard yet).
-- Limits: free players 1 submission per challenge; premium players 3 per challenge.

-- ---------------------------------------------------------------------------
-- Reshape stub if an older foundation revision created weekly_challenge_id / user_id.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'weekly_challenge_submissions'
      and column_name = 'weekly_challenge_id'
  ) then
    drop table public.weekly_challenge_submissions;
  end if;
end
$$;

create table if not exists public.weekly_challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.weekly_challenges (id) on delete cascade,
  player_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid references public.videos (id) on delete set null,
  score numeric check (score is null or score >= 0),
  rank integer check (rank is null or rank > 0),
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'scored', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.weekly_challenge_submissions is
  'Player video submissions for weekly challenges. Free: 1 per challenge; premium: 3 per challenge.';

create index if not exists weekly_challenge_submissions_challenge_player_idx
  on public.weekly_challenge_submissions (challenge_id, player_id);

create index if not exists weekly_challenge_submissions_challenge_created_idx
  on public.weekly_challenge_submissions (challenge_id, created_at desc);

create index if not exists weekly_challenge_submissions_challenge_rank_idx
  on public.weekly_challenge_submissions (challenge_id, rank)
  where rank is not null;

-- ---------------------------------------------------------------------------
-- Submission limits (free = 1, premium = 3)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_weekly_challenge_submission_limit(p_player_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(u.is_premium, false) then 3
    else 1
  end
  from public.users u
  where u.id = p_player_id;
$$;

comment on function public.goalnova_weekly_challenge_submission_limit(uuid) is
  'Max weekly challenge submissions per challenge: 1 (free), 3 (premium).';

create or replace function public.goalnova_weekly_challenge_player_submission_count(
  p_challenge_id uuid,
  p_player_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.weekly_challenge_submissions s
  where s.challenge_id = p_challenge_id
    and s.player_id = p_player_id;
$$;

create or replace function public.goalnova_weekly_challenge_enforce_submission_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  v_limit := public.goalnova_weekly_challenge_submission_limit(new.player_id);
  if v_limit is null then
    raise exception 'Player profile not found for weekly challenge submission';
  end if;

  v_count := public.goalnova_weekly_challenge_player_submission_count(
    new.challenge_id,
    new.player_id
  );

  if v_count >= v_limit then
    raise exception 'Weekly challenge submission limit reached (% submissions allowed)', v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists weekly_challenge_submissions_enforce_limit on public.weekly_challenge_submissions;
create trigger weekly_challenge_submissions_enforce_limit
  before insert on public.weekly_challenge_submissions
  for each row
  execute function public.goalnova_weekly_challenge_enforce_submission_limit();

drop trigger if exists weekly_challenge_submissions_set_updated_at on public.weekly_challenge_submissions;
create trigger weekly_challenge_submissions_set_updated_at
  before update on public.weekly_challenge_submissions
  for each row
  execute function public.goalnova_weekly_challenges_set_updated_at();

revoke all on function public.goalnova_weekly_challenge_submission_limit(uuid) from public;
grant execute on function public.goalnova_weekly_challenge_submission_limit(uuid) to authenticated;

revoke all on function public.goalnova_weekly_challenge_player_submission_count(uuid, uuid) from public;
grant execute on function public.goalnova_weekly_challenge_player_submission_count(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS (admin + own-row player access; no public leaderboard reads yet)
-- ---------------------------------------------------------------------------
alter table public.weekly_challenge_submissions enable row level security;

drop policy if exists "weekly_challenge_submissions_admin_select" on public.weekly_challenge_submissions;
drop policy if exists "weekly_challenge_submissions_admin_all" on public.weekly_challenge_submissions;
drop policy if exists "weekly_challenge_submissions_player_select_own" on public.weekly_challenge_submissions;
drop policy if exists "weekly_challenge_submissions_player_insert_own" on public.weekly_challenge_submissions;
drop policy if exists "weekly_challenge_submissions_player_update_own" on public.weekly_challenge_submissions;

create policy "weekly_challenge_submissions_admin_all"
  on public.weekly_challenge_submissions
  for all
  to authenticated
  using (public.goalnova_weekly_challenge_admin())
  with check (public.goalnova_weekly_challenge_admin());

create policy "weekly_challenge_submissions_player_select_own"
  on public.weekly_challenge_submissions
  for select
  to authenticated
  using (player_id = auth.uid());

create policy "weekly_challenge_submissions_player_insert_own"
  on public.weekly_challenge_submissions
  for insert
  to authenticated
  with check (player_id = auth.uid());

create policy "weekly_challenge_submissions_player_update_own"
  on public.weekly_challenge_submissions
  for update
  to authenticated
  using (player_id = auth.uid())
  with check (player_id = auth.uid());

grant select, insert, update, delete on table public.weekly_challenge_submissions to authenticated;
