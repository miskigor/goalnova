-- Premium flag on users (AI analysis and other premium features).
alter table public.users
  add column if not exists is_premium boolean not null default false;

-- AI video analysis results (one row per analyst user + video; upsert on re-run).
create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  speed double precision not null,
  technique double precision not null,
  decision_making double precision not null,
  agility double precision not null,
  shot_power double precision not null,
  overall_score double precision not null,
  feedback_text text not null,
  created_at timestamptz not null default now(),
  constraint ai_analyses_scores_range check (
    speed between 0 and 100
    and technique between 0 and 100
    and decision_making between 0 and 100
    and agility between 0 and 100
    and shot_power between 0 and 100
    and overall_score between 0 and 100
  ),
  constraint ai_analyses_user_video_unique unique (user_id, video_id)
);

create index if not exists ai_analyses_video_id_idx on public.ai_analyses (video_id);
create index if not exists ai_analyses_user_id_idx on public.ai_analyses (user_id);

alter table public.ai_analyses enable row level security;

create policy "ai_analyses_select_own"
  on public.ai_analyses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "ai_analyses_insert_premium_self"
  on public.ai_analyses
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and coalesce(u.is_premium, false) = true
    )
  );

create policy "ai_analyses_update_premium_self"
  on public.ai_analyses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and coalesce(u.is_premium, false) = true
    )
  );

grant select, insert, update on table public.ai_analyses to authenticated;
