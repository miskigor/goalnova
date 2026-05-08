-- Challenge in-app notifications: optional FK + type `challenge`, staff-only broadcast RPC.

alter table public.notifications
  add column if not exists related_challenge_id uuid references public.challenges (id) on delete set null;

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'follow',
    'like',
    'comment',
    'message',
    'ai_analysis',
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification',
    'challenge'
  ));

create index if not exists notifications_related_challenge_id_idx
  on public.notifications (related_challenge_id)
  where related_challenge_id is not null;

-- ---------------------------------------------------------------------------
-- Staff: notify all non-deleted players about an active challenge (idempotent per user+challenge).
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_notify_players_about_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_title text;
  v_status text;
  v_msg text;
  v_inserted int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select c.title, c.status
  into v_title, v_status
  from public.challenges c
  where c.id = p_challenge_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'challenge_not_found');
  end if;

  if v_status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'error', 'challenge_not_active');
  end if;

  v_msg := case
    when v_title is not null and length(trim(v_title)) > 0
      then 'New challenge: ' || trim(v_title)
    else 'New challenge'
  end;

  insert into public.notifications (
    user_id,
    type,
    message,
    related_user_id,
    related_video_id,
    related_challenge_id
  )
  select
    u.id,
    'challenge',
    v_msg,
    u.id,
    null,
    p_challenge_id
  from public.users u
  where u.role = 'player'
    and coalesce(u.is_deleted, false) = false
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = u.id
        and n.type = 'challenge'
        and n.related_challenge_id = p_challenge_id
    );

  get diagnostics v_inserted = row_count;

  return jsonb_build_object('ok', true, 'inserted', v_inserted);
end;
$$;

revoke all on function public.goalnova_notify_players_about_challenge(uuid) from public;
grant execute on function public.goalnova_notify_players_about_challenge(uuid) to authenticated;
