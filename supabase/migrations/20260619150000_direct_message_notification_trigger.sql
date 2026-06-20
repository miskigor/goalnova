-- Create in-app notification when a direct message is inserted (server-side; reliable for receiver alerts).

create or replace function public.goalnova_notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preview text;
begin
  if new.receiver_id is null or new.sender_id is null then
    return new;
  end if;
  if new.receiver_id = new.sender_id then
    return new;
  end if;

  v_preview := left(trim(coalesce(new.message, '')), 120);
  if v_preview = '' then
    v_preview := ' ';
  end if;

  insert into public.notifications (user_id, type, message, related_user_id, is_read)
  select new.receiver_id, 'message', v_preview, new.sender_id, false
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = new.receiver_id
      and n.type = 'message'
      and n.related_user_id = new.sender_id
      and n.is_read = false
  );

  -- Refresh preview on existing unread row so inbox shows latest text.
  update public.notifications n
  set message = v_preview,
      created_at = now()
  where n.user_id = new.receiver_id
    and n.type = 'message'
    and n.related_user_id = new.sender_id
    and n.is_read = false;

  return new;
exception
  when others then
    -- Never block message delivery if notification insert fails.
    return new;
end;
$$;

drop trigger if exists trg_messages_notify_receiver on public.messages;
create trigger trg_messages_notify_receiver
  after insert on public.messages
  for each row
  execute function public.goalnova_notify_on_direct_message();

revoke all on function public.goalnova_notify_on_direct_message() from public;
