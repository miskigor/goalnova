-- Support tickets: category + threaded messages + admin reply notification

alter table public.support_tickets
  add column if not exists category text not null default 'other'
    check (category in (
      'account_issue',
      'verification_issue',
      'payment_issue',
      'report_problem',
      'bug_report',
      'other'
    ));

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_user_id uuid references public.users (id) on delete set null,
  sender_admin_id uuid references public.users (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint support_ticket_messages_sender_check check (
    (sender_user_id is not null and sender_admin_id is null) or
    (sender_user_id is null and sender_admin_id is not null)
  )
);

create index if not exists support_ticket_messages_ticket_id_idx
  on public.support_ticket_messages (ticket_id, created_at asc);

alter table public.support_ticket_messages enable row level security;

drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own"
on public.support_tickets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
on public.support_tickets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "support_tickets_select_admin" on public.support_tickets;
create policy "support_tickets_select_admin"
on public.support_tickets
for select
to authenticated
using (public.goalnova_staff_effective_role() is not null);

drop policy if exists "support_tickets_update_admin" on public.support_tickets;
create policy "support_tickets_update_admin"
on public.support_tickets
for update
to authenticated
using (public.goalnova_staff_effective_role() is not null)
with check (public.goalnova_staff_effective_role() is not null);

drop policy if exists "support_ticket_messages_select_own" on public.support_ticket_messages;
create policy "support_ticket_messages_select_own"
on public.support_ticket_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "support_ticket_messages_insert_own" on public.support_ticket_messages;
create policy "support_ticket_messages_insert_own"
on public.support_ticket_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and sender_admin_id is null
  and exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "support_ticket_messages_select_admin" on public.support_ticket_messages;
create policy "support_ticket_messages_select_admin"
on public.support_ticket_messages
for select
to authenticated
using (public.goalnova_staff_effective_role() is not null);

drop policy if exists "support_ticket_messages_insert_admin" on public.support_ticket_messages;
create policy "support_ticket_messages_insert_admin"
on public.support_ticket_messages
for insert
to authenticated
with check (
  sender_admin_id = auth.uid()
  and sender_user_id is null
  and public.goalnova_staff_effective_role() is not null
);

create or replace function public.goalnova_create_support_ticket(
  p_subject text,
  p_message text,
  p_category text default 'other'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_uid := auth.uid();

  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  v_category := lower(trim(coalesce(p_category, 'other')));
  if v_category not in ('account_issue', 'verification_issue', 'payment_issue', 'report_problem', 'bug_report', 'other') then
    v_category := 'other';
  end if;

  insert into public.support_tickets (user_id, subject, message, category)
  values (v_uid, trim(p_subject), trim(p_message), v_category)
  returning id into v_id;

  insert into public.support_ticket_messages (ticket_id, sender_user_id, message)
  values (v_id, v_uid, trim(p_message));

  return v_id;
end;
$$;

revoke all on function public.goalnova_create_support_ticket(text, text, text) from public;
grant execute on function public.goalnova_create_support_ticket(text, text, text) to authenticated;

create or replace function public.goalnova_admin_create_support_ticket_for_user(
  p_user_id uuid,
  p_subject text,
  p_message text,
  p_assigned_admin_id uuid default null,
  p_category text default 'other'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_id uuid;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'moderator' then
    raise exception 'Forbidden';
  end if;

  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  if p_assigned_admin_id is not null and v_staff <> 'super_admin' and p_assigned_admin_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  v_category := lower(trim(coalesce(p_category, 'other')));
  if v_category not in ('account_issue', 'verification_issue', 'payment_issue', 'report_problem', 'bug_report', 'other') then
    v_category := 'other';
  end if;

  insert into public.support_tickets (user_id, subject, message, category, assigned_admin_id, status)
  values (p_user_id, trim(p_subject), trim(p_message), v_category, p_assigned_admin_id, 'open')
  returning id into v_id;

  insert into public.support_ticket_messages (ticket_id, sender_admin_id, message)
  values (v_id, auth.uid(), trim(p_message));

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'support_ticket_created_by_admin',
    jsonb_build_object('ticket_id', v_id, 'assigned_admin_id', p_assigned_admin_id)
  );

  return v_id;
end;
$$;

revoke all on function public.goalnova_admin_create_support_ticket_for_user(uuid, text, text, uuid, text) from public;
grant execute on function public.goalnova_admin_create_support_ticket_for_user(uuid, text, text, uuid, text) to authenticated;

create or replace function public.goalnova_admin_list_support_ticket_messages(
  p_ticket_id uuid
)
returns setof public.support_ticket_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  return query
  select m.*
  from public.support_ticket_messages m
  where m.ticket_id = p_ticket_id
  order by m.created_at asc;
end;
$$;

revoke all on function public.goalnova_admin_list_support_ticket_messages(uuid) from public;
grant execute on function public.goalnova_admin_list_support_ticket_messages(uuid) to authenticated;

create or replace function public.goalnova_admin_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user_id uuid;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  select t.user_id into v_user_id
  from public.support_tickets t
  where t.id = p_ticket_id;
  if v_user_id is null then
    raise exception 'Ticket not found';
  end if;

  insert into public.support_ticket_messages (ticket_id, sender_admin_id, message)
  values (p_ticket_id, auth.uid(), trim(p_message))
  returning id into v_message_id;

  update public.support_tickets t
  set
    status = case when t.status = 'closed' then 'in_progress' else t.status end,
    updated_at = now()
  where t.id = p_ticket_id;

  insert into public.notifications (user_id, type, message, related_user_id, is_read)
  values (
    v_user_id,
    'profile',
    'PitchRusch Support replied to your ticket',
    auth.uid(),
    false
  );

  perform public.goalnova_admin_audit_log(
    v_user_id,
    'support_ticket_reply',
    jsonb_build_object('ticket_id', p_ticket_id, 'message_id', v_message_id)
  );

  return v_message_id;
end;
$$;

revoke all on function public.goalnova_admin_reply_support_ticket(uuid, text) from public;
grant execute on function public.goalnova_admin_reply_support_ticket(uuid, text) to authenticated;

