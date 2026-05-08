-- Fix soft-hide RPC when auth.uid() is null inside SECURITY DEFINER (same pattern as notifications delete).

create or replace function public.goalnova_hide_message_for_me(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  uid uuid;
begin
  uid := (select auth.uid());

  if uid is null then
    begin
      uid := (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
    exception
      when others then
        uid := null;
    end;
  end if;

  if uid is null then
    return false;
  end if;

  update public.messages m
  set
    deleted_for_sender = case
      when m.sender_id = uid then true
      else m.deleted_for_sender
    end,
    deleted_for_recipient = case
      when m.receiver_id = uid then true
      else m.deleted_for_recipient
    end
  where m.id = p_message_id
    and (m.sender_id = uid or m.receiver_id = uid);

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.goalnova_hide_message_for_me(uuid) from public;
grant execute on function public.goalnova_hide_message_for_me(uuid) to authenticated;
