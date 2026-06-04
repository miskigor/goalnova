-- Weekly Challenges (admin-only foundation; not exposed on public Challenges UI yet).

-- ---------------------------------------------------------------------------
-- Admin gate: staff OR configured bootstrap email (JWT email claim).
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_weekly_challenge_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.goalnova_staff_effective_role() is not null
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'royalexpert1@gmail.com';
$$;

revoke all on function public.goalnova_weekly_challenge_admin() from public;
grant execute on function public.goalnova_weekly_challenge_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- weekly_challenges
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  rules text,
  equipment text,
  reward_xp integer not null default 0 check (reward_xp >= 0),
  badge_name text,
  max_video_duration_seconds integer check (
    max_video_duration_seconds is null or max_video_duration_seconds > 0
  ),
  free_attempts integer not null default 1 check (free_attempts >= 0),
  premium_attempts integer not null default 0 check (premium_attempts >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  is_public boolean not null default false,
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.weekly_challenges is
  'Weekly skill challenges (admin-managed; public player UI not wired yet).';

comment on column public.weekly_challenges.translations is
  'Per-locale content. Locale keys: en, hr, de, bs, es, pt, sr, fr, it, nl, tr, ar. '
  'Each locale object: { title, description, rules, equipment, badge_name }. '
  'Base columns (title, description, rules, equipment, badge_name) mirror English (en) as fallback.';

create index if not exists weekly_challenges_starts_at_idx
  on public.weekly_challenges (starts_at desc nulls last);

create index if not exists weekly_challenges_is_active_idx
  on public.weekly_challenges (is_active)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- weekly_challenge_submissions (foundation only — no player upload flow yet)
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  weekly_challenge_id uuid not null references public.weekly_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid references public.videos (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'scored', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_challenge_submissions_challenge_idx
  on public.weekly_challenge_submissions (weekly_challenge_id, created_at desc);

-- ---------------------------------------------------------------------------
-- weekly_challenge_badges (foundation only)
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_challenge_badges (
  id uuid primary key default gen_random_uuid(),
  weekly_challenge_id uuid not null references public.weekly_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_name text not null,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists weekly_challenge_badges_user_idx
  on public.weekly_challenge_badges (user_id, earned_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_weekly_challenges_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists weekly_challenges_set_updated_at on public.weekly_challenges;
create trigger weekly_challenges_set_updated_at
  before update on public.weekly_challenges
  for each row
  execute function public.goalnova_weekly_challenges_set_updated_at();

drop trigger if exists weekly_challenge_submissions_set_updated_at on public.weekly_challenge_submissions;
create trigger weekly_challenge_submissions_set_updated_at
  before update on public.weekly_challenge_submissions
  for each row
  execute function public.goalnova_weekly_challenges_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: admin-only (no public read while is_public launch is deferred)
-- ---------------------------------------------------------------------------
alter table public.weekly_challenges enable row level security;
alter table public.weekly_challenge_submissions enable row level security;
alter table public.weekly_challenge_badges enable row level security;

drop policy if exists "weekly_challenges_admin_all" on public.weekly_challenges;
create policy "weekly_challenges_admin_all"
  on public.weekly_challenges
  for all
  to authenticated
  using (public.goalnova_weekly_challenge_admin())
  with check (public.goalnova_weekly_challenge_admin());

drop policy if exists "weekly_challenge_submissions_admin_select" on public.weekly_challenge_submissions;
create policy "weekly_challenge_submissions_admin_select"
  on public.weekly_challenge_submissions
  for select
  to authenticated
  using (public.goalnova_weekly_challenge_admin());

drop policy if exists "weekly_challenge_badges_admin_select" on public.weekly_challenge_badges;
create policy "weekly_challenge_badges_admin_select"
  on public.weekly_challenge_badges
  for select
  to authenticated
  using (public.goalnova_weekly_challenge_admin());

grant select, insert, update, delete on table public.weekly_challenges to authenticated;
grant select on table public.weekly_challenge_submissions to authenticated;
grant select on table public.weekly_challenge_badges to authenticated;
