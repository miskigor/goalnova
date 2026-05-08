-- Admin user notices: send in-app notifications to a target user from staff tools.

create or replace function public.goalnova_admin_send_user_notice(
  p_user_id uuid,
  p_notice_type text,
  p_message text,
  p_locale text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_actor_id uuid := auth.uid();
  v_notice_type text := lower(trim(coalesce(p_notice_type, 'custom')));
  v_message text := trim(coalesce(p_message, ''));
  v_target_exists boolean := false;
  v_notification public.notifications%rowtype;
  v_direct_message public.messages%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  if v_notice_type not in (
    'warning',
    'guideline_violation',
    'profile_issue',
    'suspension_warning',
    'verification_issue',
    'custom'
  ) then
    raise exception 'Invalid notice type';
  end if;

  if char_length(v_message) = 0 then
    raise exception 'Message required';
  end if;

  select true
  into v_target_exists
  from public.users u
  where u.id = p_user_id
  limit 1;

  if not coalesce(v_target_exists, false) then
    raise exception 'User not found';
  end if;

  insert into public.notifications (
    user_id,
    type,
    message,
    related_user_id,
    is_read,
    created_at
  )
  values (
    p_user_id,
    'admin_notice',
    v_message,
    v_actor_id,
    false,
    now()
  )
  returning * into v_notification;

  -- Mirror admin notice into direct messages so user sees it immediately in inbox.
  insert into public.messages (
    sender_id,
    receiver_id,
    message
  )
  values (
    v_actor_id,
    p_user_id,
    v_message
  )
  returning * into v_direct_message;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'admin_notice_sent',
    jsonb_build_object(
      'notice_type', v_notice_type,
      'message', v_message,
      'locale', nullif(trim(coalesce(p_locale, '')), ''),
      'notification_id', v_notification.id,
      'message_id', v_direct_message.id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'notice_type', v_notice_type,
    'column_used', 'notifications.type=admin_notice',
    'notification', to_jsonb(v_notification),
    'direct_message', to_jsonb(v_direct_message)
  );
end;
$$;

revoke all on function public.goalnova_admin_send_user_notice(uuid, text, text, text) from public;
grant execute on function public.goalnova_admin_send_user_notice(uuid, text, text, text) to authenticated;
