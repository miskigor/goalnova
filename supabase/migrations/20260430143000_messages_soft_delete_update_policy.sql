-- Allow authenticated DM participants to soft-delete from their own side via UPDATE.
-- Needed for client-side:
--   update messages set deleted_for_sender/deleted_for_recipient ...

drop policy if exists "messages_update_participants_soft_delete" on public.messages;

create policy "messages_update_participants_soft_delete"
  on public.messages
  for update
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);

grant update on table public.messages to authenticated;
