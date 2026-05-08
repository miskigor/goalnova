-- User reply RPC to avoid client-side RLS insert failures.

create or replace function public.goalnova_user_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_ticket public.support_tickets%rowtype;
  v_message_id uuid;
  v_body text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_ticket
  from public.support_tickets
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Ticket not found';
  end if;

  if v_ticket.user_id is distinct from v_uid then
    raise exception 'Forbidden';
  end if;

  v_body := trim(coalesce(p_message, ''));
  if length(v_body) < 2 then
    raise exception 'Invalid message';
  end if;

  insert into public.support_ticket_messages (
    ticket_id,
    sender_user_id,
    sender_admin_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (
    p_ticket_id,
    v_uid,
    null,
    v_body,
    now(),
    null
  )
  returning id into v_message_id;

  update public.support_tickets t
  set updated_at = now()
  where t.id = p_ticket_id;

  return v_message_id;
end;
$$;

revoke all on function public.goalnova_user_reply_support_ticket(uuid, text) from public;
grant execute on function public.goalnova_user_reply_support_ticket(uuid, text) to authenticated;
