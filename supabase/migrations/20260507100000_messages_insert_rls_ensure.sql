-- Ensure DM INSERT works: auth.uid() must equal sender_id (see lib/supabase/messages.ts).
-- Fixes PostgREST 42501 when insert policies were dropped or edited in Dashboard.

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.messages', r.policyname);
  end loop;
end $$;

create policy "messages_insert_as_sender"
  on public.messages
  as permissive
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
  );

grant insert on table public.messages to authenticated;
