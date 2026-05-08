-- Notify ticket owner when support/admin sends a ticket message.

create or replace function public.goalnova_notify_user_support_ticket_admin_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_message text;
begin
  -- Only admin/support-authored messages should notify ticket owner.
  if new.sender_admin_id is null then
    return new;
  end if;

  select *
  into v_ticket
  from public.support_tickets
  where id = new.ticket_id;

  if v_ticket.id is null or v_ticket.user_id is null then
    return new;
  end if;

  v_message := 'PitchRusch Support replied to your ticket';

  -- Avoid accidental duplicates from mixed RPC + trigger paths.
  if exists (
    select 1
    from public.notifications n
    where n.user_id = v_ticket.user_id
      and n.type = 'profile'
      and n.message = v_message
      and n.related_user_id = new.sender_admin_id
      and n.created_at > now() - interval '30 seconds'
  ) then
    return new;
  end if;

  insert into public.notifications (user_id, type, message, related_user_id, is_read)
  values (v_ticket.user_id, 'profile', v_message, new.sender_admin_id, false);

  return new;
end;
$$;

drop trigger if exists trg_support_ticket_notify_user_on_admin_message on public.support_ticket_messages;
create trigger trg_support_ticket_notify_user_on_admin_message
after insert on public.support_ticket_messages
for each row
execute function public.goalnova_notify_user_support_ticket_admin_message();

