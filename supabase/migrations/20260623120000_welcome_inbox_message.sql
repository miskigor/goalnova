-- Automatic welcome DM to new users (idempotent; message body is a UI token).

create table if not exists public.welcome_inbox_deliveries (
  user_id uuid primary key references public.users (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  sender_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.welcome_inbox_deliveries is
  'Tracks one-time welcome inbox message per user.';

alter table public.welcome_inbox_deliveries enable row level security;

revoke all on table public.welcome_inbox_deliveries from public, authenticated, anon;

create or replace function public.goalnova_resolve_welcome_inbox_sender()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.admin_role = 'super_admin'
     or coalesce(u.is_admin, false) = true
  order by
    case when u.admin_role = 'super_admin' then 0 else 1 end,
    u.created_at asc
  limit 1;
$$;

revoke all on function public.goalnova_resolve_welcome_inbox_sender() from public;
grant execute on function public.goalnova_resolve_welcome_inbox_sender() to authenticated, service_role;

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

revoke all on function public.goalnova_send_welcome_inbox_message(uuid) from public;
grant execute on function public.goalnova_send_welcome_inbox_message(uuid) to authenticated;
grant execute on function public.goalnova_send_welcome_inbox_message(uuid) to service_role;
