-- Allow staff to delete support ticket messages from admin support UI.

create or replace function public.goalnova_admin_delete_support_ticket_message(
  p_message_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_ticket_id uuid;
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select m.ticket_id
  into v_ticket_id
  from public.support_ticket_messages m
  where m.id = p_message_id;

  if v_ticket_id is null then
    raise exception 'Message not found';
  end if;

  select t.user_id
  into v_owner_id
  from public.support_tickets t
  where t.id = v_ticket_id;

  delete from public.support_ticket_messages
  where id = p_message_id;

  perform public.goalnova_admin_audit_log(
    v_owner_id,
    'support_ticket_message_deleted',
    jsonb_build_object('ticket_id', v_ticket_id, 'message_id', p_message_id)
  );

  return true;
end;
$$;

revoke all on function public.goalnova_admin_delete_support_ticket_message(uuid) from public;
grant execute on function public.goalnova_admin_delete_support_ticket_message(uuid) to authenticated;
