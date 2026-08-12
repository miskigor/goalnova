-- Welcome DM: DB trigger on player profile create + repair stuck deliveries.
-- Run in Supabase SQL Editor.

-- 1) Stronger send: if delivery row exists but message is gone, allow resend.
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
  v_delivery_message_id uuid;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  -- Allow service role / triggers (no jwt) and the recipient themselves.
  if v_actor is not null and v_actor <> p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if not exists (select 1 from public.users u where u.id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'user_not_found');
  end if;

  select m.id
  into v_existing_message_id
  from public.messages m
  where m.receiver_id = p_user_id
    and trim(m.message) = v_token
  order by m.created_at asc
  limit 1;

  if v_existing_message_id is not null then
    insert into public.welcome_inbox_deliveries (user_id, message_id, sender_id)
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

  -- Stuck delivery without message → clear and continue.
  select d.message_id into v_delivery_message_id
  from public.welcome_inbox_deliveries d
  where d.user_id = p_user_id;

  if found then
    if v_delivery_message_id is null
       or not exists (select 1 from public.messages m where m.id = v_delivery_message_id) then
      delete from public.welcome_inbox_deliveries where user_id = p_user_id;
    else
      return jsonb_build_object('ok', true, 'noop', true, 'reason', 'already_sent');
    end if;
  end if;

  v_sender := public.goalnova_resolve_welcome_inbox_sender();
  if v_sender is null then
    return jsonb_build_object('ok', false, 'reason', 'no_sender');
  end if;

  if v_sender = p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'sender_is_recipient');
  end if;

  insert into public.messages (sender_id, receiver_id, message)
  values (v_sender, p_user_id, v_token)
  returning * into v_message;

  insert into public.notifications (
    user_id, type, message, related_user_id, is_read, created_at
  )
  values (
    p_user_id, 'message', v_token, v_sender, false, now()
  )
  returning * into v_notification;

  insert into public.welcome_inbox_deliveries (user_id, message_id, sender_id)
  values (p_user_id, v_message.id, v_sender);

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
grant execute on function public.goalnova_send_welcome_inbox_message(uuid) to authenticated, service_role;

-- 2) Auto-send when a player profile is created (independent of frontend deploy).
create or replace function public.goalnova_trg_player_profile_welcome_inbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.goalnova_send_welcome_inbox_message(new.id);
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists trg_player_profiles_welcome_inbox on public.player_profiles;
create trigger trg_player_profiles_welcome_inbox
  after insert on public.player_profiles
  for each row
  execute function public.goalnova_trg_player_profile_welcome_inbox();

-- 3) Backfill: send to players who never got the welcome DM (last 90 days).
do $$
declare
  r record;
begin
  for r in
    select pp.id
    from public.player_profiles pp
    join public.users u on u.id = pp.id
    where coalesce(u.is_deleted, false) = false
      and not exists (
        select 1
        from public.messages m
        where m.receiver_id = pp.id
          and trim(m.message) = '__gn:welcome_inbox__'
      )
      and coalesce(pp.created_at, u.created_at, now()) > now() - interval '90 days'
    order by coalesce(pp.created_at, u.created_at) desc
    limit 200
  loop
    perform public.goalnova_send_welcome_inbox_message(r.id);
  end loop;
end $$;

-- 4) Sanity checks
select public.goalnova_resolve_welcome_inbox_sender() as welcome_sender_id;

select count(*) as welcome_messages
from public.messages
where trim(message) = '__gn:welcome_inbox__';
