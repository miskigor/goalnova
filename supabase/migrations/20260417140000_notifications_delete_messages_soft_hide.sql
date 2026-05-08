-- User-owned notification deletes + per-user message hide flags (soft delete for DM UX).

-- ---------------------------------------------------------------------------
-- Notifications: allow recipients to delete their own rows
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant delete on table public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Messages: soft hide per participant
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists deleted_for_sender boolean not null default false,
  add column if not exists deleted_for_recipient boolean not null default false;

comment on column public.messages.deleted_for_sender is
  'When true, the sender no longer sees this row in their UI.';
comment on column public.messages.deleted_for_recipient is
  'When true, the recipient no longer sees this row in their UI.';

create or replace function public.goalnova_hide_message_for_me(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.messages m
  set
    deleted_for_sender = case
      when m.sender_id = auth.uid() then true
      else m.deleted_for_sender
    end,
    deleted_for_recipient = case
      when m.receiver_id = auth.uid() then true
      else m.deleted_for_recipient
    end
  where m.id = p_message_id
    and (m.sender_id = auth.uid() or m.receiver_id = auth.uid());

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.goalnova_hide_message_for_me(uuid) from public;
grant execute on function public.goalnova_hide_message_for_me(uuid) to authenticated;
