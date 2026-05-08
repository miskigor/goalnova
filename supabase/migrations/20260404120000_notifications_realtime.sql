-- Enable Supabase Realtime for in-app notifications (RLS still applies per subscriber).
-- REPLICA IDENTITY FULL so UPDATE payloads include prior row values (e.g. is_read transitions).

alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
