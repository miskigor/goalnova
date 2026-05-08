-- Notify admin staff when users create/reply in support tickets.

create or replace function public.goalnova_notify_admins_support_ticket_user_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
begin
  -- Only user-authored messages should notify admins.
  if new.sender_user_id is null then
    return new;
  end if;

  select *
  into v_ticket
  from public.support_tickets
  where id = new.ticket_id;

  if v_ticket.id is null then
    return new;
  end if;

  -- Prefer assigned admin when present.
  if v_ticket.assigned_admin_id is not null then
    insert into public.notifications (user_id, type, message, related_user_id, is_read)
    values (
      v_ticket.assigned_admin_id,
      'profile',
      format('New support ticket message: %s', coalesce(v_ticket.subject, 'Support ticket')),
      new.sender_user_id,
      false
    );
    return new;
  end if;

  -- Otherwise notify all support-capable staff.
  insert into public.notifications (user_id, type, message, related_user_id, is_read)
  select
    u.id,
    'profile',
    format('New support ticket: %s', coalesce(v_ticket.subject, 'Support ticket')),
    new.sender_user_id,
    false
  from public.users u
  where (
    u.admin_role in ('super_admin', 'support_admin')
    or (coalesce(u.is_admin, false) = true and u.admin_role is null)
  );

  return new;
end;
$$;

drop trigger if exists trg_support_ticket_admin_notify_on_user_message on public.support_ticket_messages;
create trigger trg_support_ticket_admin_notify_on_user_message
after insert on public.support_ticket_messages
for each row
execute function public.goalnova_notify_admins_support_ticket_user_message();

