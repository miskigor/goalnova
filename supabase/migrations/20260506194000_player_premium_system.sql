-- Player Premium system (idempotent, safe re-run)

alter table public.player_profiles
add column if not exists subscription_plan text default 'free';

alter table public.player_profiles
add column if not exists subscription_status text default 'inactive';

alter table public.player_profiles
add column if not exists subscription_current_period_end timestamptz null;

alter table public.player_profiles
add column if not exists is_available_for_trials boolean default false;

alter table public.player_profiles
add column if not exists is_looking_for_club boolean default false;

alter table public.player_profiles
add column if not exists achievements text[] default '{}'::text[];

alter table public.player_profiles
add column if not exists career_history jsonb default '[]'::jsonb;

alter table public.player_profiles
add column if not exists profile_highlight text null;

alter table public.player_profiles
add column if not exists profile_completeness numeric null;

alter table public.player_profiles
add column if not exists ai_overall_score numeric null;

alter table public.videos
add column if not exists is_featured boolean default false;

alter table public.videos
add column if not exists views_count bigint default 0;

alter table public.videos
add column if not exists visibility_boost int default 0;

create table if not exists public.player_usage_limits (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  videos_uploaded int not null default 0,
  month text not null,
  created_at timestamptz not null default now(),
  unique (player_id, month)
);

create table if not exists public.player_profile_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  profile_views bigint not null default 0,
  video_views bigint not null default 0,
  scout_saves bigint not null default 0,
  scout_contacts bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (player_id)
);

create or replace view public.scout_video_feed as
select
  v.*,
  p.full_name,
  p.username,
  p.city as profile_city,
  p.country as profile_country,
  p.position as profile_position,
  p.subscription_plan,
  p.subscription_status,
  p.ai_overall_score,
  p.profile_completeness,
  case
    when p.subscription_plan = 'player_premium'
      and p.subscription_status = 'active'
    then 1 else 0
  end as premium_boost
from public.videos v
join public.player_profiles p on p.id = v.user_id;

drop policy if exists "videos_select_public" on public.videos;
create policy "videos_select_public"
on public.videos
for select
using (true);

drop policy if exists "videos_update_own_featured" on public.videos;
create policy "videos_update_own_featured"
on public.videos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
