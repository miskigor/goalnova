-- Enable Realtime broadcasts for new messages (required for postgres_changes subscriptions).
-- Safe to run once; ignore error if the table is already in the publication.

alter publication supabase_realtime add table public.messages;
