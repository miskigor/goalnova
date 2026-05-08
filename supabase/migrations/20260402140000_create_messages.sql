-- Direct messages between authenticated users.
-- Apply in Supabase SQL editor or via CLI: supabase db push
--
-- After changing this table, regenerate TypeScript:
--   npx supabase gen types typescript --project-id "<ref>" --schema public > lib/supabase/database.types.ts
-- (see header in lib/supabase/database.types.ts)

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid not null references public.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint messages_message_not_blank check (length(trim(message)) > 0),
  constraint messages_no_self_send check (sender_id <> receiver_id)
);

create index if not exists messages_sender_created_at_idx
  on public.messages (sender_id, created_at desc);

create index if not exists messages_receiver_created_at_idx
  on public.messages (receiver_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages_select_participants" on public.messages;
drop policy if exists "messages_insert_as_sender" on public.messages;

create policy "messages_select_participants"
  on public.messages
  for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "messages_insert_as_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
  );

grant select, insert on table public.messages to authenticated;
