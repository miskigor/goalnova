-- Welcome inbox: send only once (guard by delivery row + existing message).

create or replace function public.goalnova_send_welcome_inbox_message(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_sender uuid;
  v_message public.messages%rowtype;
  v_notification public.notifications%rowtype;
  v_token constant text := '__gn:welcome_inbox__';
  v_existing_message_id uuid;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  if v_actor is not null and v_actor <> p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if not exists (select 1 from public.users u where u.id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'user_not_found');
  end if;

  if exists (
    select 1 from public.welcome_inbox_deliveries d where d.user_id = p_user_id
  ) then
    return jsonb_build_object('ok', true, 'noop', true, 'reason', 'already_sent');
  end if;

  select m.id
  into v_existing_message_id
  from public.messages m
  where m.receiver_id = p_user_id
    and trim(m.message) = v_token
  order by m.created_at asc
  limit 1;

  if v_existing_message_id is not null then
    insert into public.welcome_inbox_deliveries (
      user_id,
      message_id,
      sender_id
    )
    values (
      p_user_id,
      v_existing_message_id,
      (select m.sender_id from public.messages m where m.id = v_existing_message_id)
    )
    on conflict (user_id) do nothing;

    return jsonb_build_object(
      'ok', true,
      'noop', true,
      'reason', 'already_sent',
      'message_id', v_existing_message_id
    );
  end if;

  v_sender := public.goalnova_resolve_welcome_inbox_sender();
  if v_sender is null then
    return jsonb_build_object('ok', false, 'reason', 'no_sender');
  end if;

  if v_sender = p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'sender_is_recipient');
  end if;

  insert into public.messages (
    sender_id,
    receiver_id,
    message
  )
  values (
    v_sender,
    p_user_id,
    v_token
  )
  returning * into v_message;

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
    'message',
    v_token,
    v_sender,
    false,
    now()
  )
  returning * into v_notification;

  insert into public.welcome_inbox_deliveries (
    user_id,
    message_id,
    sender_id
  )
  values (
    p_user_id,
    v_message.id,
    v_sender
  );

  return jsonb_build_object(
    'ok', true,
    'message_id', v_message.id,
    'notification_id', v_notification.id,
    'sender_id', v_sender
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', true, 'noop', true, 'reason', 'already_sent');
end;
$$;

-- Backfill delivery rows for users who already received the welcome DM.
insert into public.welcome_inbox_deliveries (user_id, message_id, sender_id)
select distinct on (m.receiver_id)
  m.receiver_id,
  m.id,
  m.sender_id
from public.messages m
where trim(m.message) = '__gn:welcome_inbox__'
order by m.receiver_id, m.created_at asc
on conflict (user_id) do nothing;
