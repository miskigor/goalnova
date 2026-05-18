-- Scout AI Insight: per-scout/video usage audit + consume RPC (free preview limit).

create table if not exists public.scout_ai_insight_events (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint scout_ai_insight_events_scout_video_unique unique (scout_id, video_id)
);

create index if not exists scout_ai_insight_events_scout_id_idx
  on public.scout_ai_insight_events (scout_id);

comment on table public.scout_ai_insight_events is
  'One row per scout+video when a new AI insight analysis was started (free preview audit).';

alter table public.scout_ai_insight_events enable row level security;

drop policy if exists "scout_ai_insight_events_select_own" on public.scout_ai_insight_events;
create policy "scout_ai_insight_events_select_own"
  on public.scout_ai_insight_events
  for select
  to authenticated
  using (auth.uid() = scout_id);

grant select on table public.scout_ai_insight_events to authenticated;

-- Approved scouts may read analysis rows for insight UI (scores already exposed via discovery RPC).
drop policy if exists "ai_analyses_select_approved_scout" on public.ai_analyses;
create policy "ai_analyses_select_approved_scout"
  on public.ai_analyses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'scout'
        and coalesce(u.scout_verification_status, 'none') = 'approved'
    )
  );

create or replace function public.goalnova_scout_has_insight_event(p_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.scout_ai_insight_events e
    where e.scout_id = auth.uid()
      and e.video_id = p_video_id
  );
$$;

revoke all on function public.goalnova_scout_has_insight_event(uuid) from public;
grant execute on function public.goalnova_scout_has_insight_event(uuid) to authenticated;

drop policy if exists "ai_analyses_insert_scout_insight" on public.ai_analyses;
create policy "ai_analyses_insert_scout_insight"
  on public.ai_analyses
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.goalnova_scout_has_insight_event(video_id)
  );

drop policy if exists "ai_analyses_update_scout_insight" on public.ai_analyses;
create policy "ai_analyses_update_scout_insight"
  on public.ai_analyses
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.goalnova_scout_has_insight_event(video_id)
  )
  with check (
    auth.uid() = user_id
    and public.goalnova_scout_has_insight_event(video_id)
  );

create or replace function public.goalnova_scout_is_pro_or_club(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        (
          coalesce(sp.subscription_plan, 'free') in ('scout_pro', 'club')
          and coalesce(sp.subscription_status, 'inactive') = 'active'
        )
        or (
          coalesce(u.subscription_plan, 'free') in ('scout_pro', 'club')
          and coalesce(u.subscription_status, 'inactive') = 'active'
        )
      from public.users u
      left join public.scout_profiles sp on sp.id = u.id
      where u.id = p_user_id
    ),
    false
  );
$$;

revoke all on function public.goalnova_scout_is_pro_or_club(uuid) from public;
grant execute on function public.goalnova_scout_is_pro_or_club(uuid) to authenticated;

create or replace function public.goalnova_consume_scout_ai_preview(
  p_video_id uuid,
  p_for_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_ver text;
  v_staff text;
  v_is_pro boolean := false;
  v_existing_analysis boolean := false;
  v_has_event boolean := false;
  v_previews_used int := 0;
  v_previews_limit int := 3;
  v_previews_left int;
  v_can_run boolean := false;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_video_id is null then
    raise exception 'invalid_video_id' using errcode = '22023';
  end if;

  select u.role, coalesce(u.scout_verification_status, 'none')
  into v_role, v_ver
  from public.users u
  where u.id = v_uid;

  v_staff := public.goalnova_staff_effective_role();

  if v_staff is null and (v_role is distinct from 'scout' or v_ver is distinct from 'approved') then
    raise exception 'scout_verification_required' using errcode = 'P0001';
  end if;

  v_is_pro := public.goalnova_scout_is_pro_or_club(v_uid)
    or v_staff is not null;

  select exists (
    select 1 from public.ai_analyses a where a.video_id = p_video_id
  )
  into v_existing_analysis;

  select exists (
    select 1
    from public.scout_ai_insight_events e
    where e.scout_id = v_uid and e.video_id = p_video_id
  )
  into v_has_event;

  select count(*)::int
  into v_previews_used
  from public.scout_ai_insight_events e
  where e.scout_id = v_uid;

  if v_is_pro then
    v_previews_left := v_previews_limit;
  else
    v_previews_left := greatest(0, v_previews_limit - v_previews_used);
  end if;

  v_can_run := not v_existing_analysis
    and (v_is_pro or v_previews_left > 0 or v_has_event);

  if p_for_run then
    if v_existing_analysis then
      return jsonb_build_object(
        'ok', true,
        'canRun', false,
        'previewsUsed', v_previews_used,
        'previewsLimit', v_previews_limit,
        'previewsLeft', v_previews_left,
        'isScoutPro', v_is_pro,
        'existingAnalysis', true
      );
    end if;

    if v_has_event then
      return jsonb_build_object(
        'ok', true,
        'canRun', true,
        'previewsUsed', v_previews_used,
        'previewsLimit', v_previews_limit,
        'previewsLeft', v_previews_left,
        'isScoutPro', v_is_pro,
        'existingAnalysis', false
      );
    end if;

    if not v_is_pro and v_previews_used >= v_previews_limit then
      raise exception 'scout_ai_preview_limit_reached' using errcode = 'P0001';
    end if;

    insert into public.scout_ai_insight_events (scout_id, video_id)
    values (v_uid, p_video_id)
    on conflict (scout_id, video_id) do nothing;

    select count(*)::int
    into v_previews_used
    from public.scout_ai_insight_events e
    where e.scout_id = v_uid;

    if v_is_pro then
      v_previews_left := v_previews_limit;
    else
      v_previews_left := greatest(0, v_previews_limit - v_previews_used);
    end if;

    return jsonb_build_object(
      'ok', true,
      'canRun', true,
      'previewsUsed', v_previews_used,
      'previewsLimit', v_previews_limit,
      'previewsLeft', v_previews_left,
      'isScoutPro', v_is_pro,
      'existingAnalysis', false
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'canRun', v_can_run,
    'previewsUsed', v_previews_used,
    'previewsLimit', v_previews_limit,
    'previewsLeft', v_previews_left,
    'isScoutPro', v_is_pro,
    'existingAnalysis', v_existing_analysis
  );
end;
$$;

revoke all on function public.goalnova_consume_scout_ai_preview(uuid, boolean) from public;
grant execute on function public.goalnova_consume_scout_ai_preview(uuid, boolean) to authenticated;

grant execute on function public.goalnova_consume_scout_ai_preview(uuid) to authenticated;
