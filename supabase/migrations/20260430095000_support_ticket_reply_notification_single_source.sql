-- Avoid duplicate user notifications on admin support reply.
-- Single source of truth: trigger `trg_support_ticket_notify_user_on_admin_message`.

create or replace function public.goalnova_admin_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user_id uuid;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  select t.user_id into v_user_id
  from public.support_tickets t
  where t.id = p_ticket_id;
  if v_user_id is null then
    raise exception 'Ticket not found';
  end if;

  insert into public.support_ticket_messages (
    ticket_id,
    sender_admin_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (p_ticket_id, auth.uid(), trim(p_message), null, now())
  returning id into v_message_id;

  update public.support_tickets t
  set
    status = case when t.status = 'closed' then 'in_progress' else t.status end,
    updated_at = now()
  where t.id = p_ticket_id;

  -- IMPORTANT: notification insert removed from RPC.
  -- Trigger `trg_support_ticket_notify_user_on_admin_message`
  -- is responsible for inserting one deduplicated notification.

  perform public.goalnova_admin_audit_log(
    v_user_id,
    'support_ticket_reply',
    jsonb_build_object('ticket_id', p_ticket_id, 'message_id', v_message_id)
  );

  return v_message_id;
end;
$$;
