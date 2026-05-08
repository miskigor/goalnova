-- In-app notifications (recipient = notifications.user_id; actor = related_user_id).
-- Apply via Supabase CLI or SQL editor. Regenerate TS types when convenient.

-- Resolve video owner for social notifications under strict videos RLS (select own only).
create or replace function public.video_owner_id(p_video_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select v.user_id
  from public.videos v
  where v.id = p_video_id
  limit 1;
$$;

revoke all on function public.video_owner_id(uuid) from public;
grant execute on function public.video_owner_id(uuid) to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null
    constraint notifications_type_check check (type in (
      'follow', 'like', 'comment', 'message', 'ai_analysis'
    )),
  message text not null,
  related_user_id uuid not null references public.users (id) on delete cascade,
  related_video_id uuid references public.videos (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_desc_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where is_read = false;

alter table public.notifications enable row level security;

-- Recipients read their inbox.
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Actors insert rows where they are the related user (MVP; tighten later with triggers if needed).
create policy "notifications_insert_as_related_user"
  on public.notifications
  for insert
  to authenticated
  with check (related_user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.notifications to authenticated;
