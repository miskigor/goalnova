-- Repair INSERT on public.messages (PostgREST 42501: new row violates row-level security policy).
-- Some projects had the insert policy dropped, renamed, or a conflicting restrictive policy added in the dashboard.

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
