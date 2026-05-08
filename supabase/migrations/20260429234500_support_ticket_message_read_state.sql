-- Track read state for support thread messages

alter table public.support_ticket_messages
  add column if not exists read_by_user_at timestamptz null,
  add column if not exists read_by_admin_at timestamptz null;

-- Initial backfill for historical rows
update public.support_ticket_messages
set
  read_by_user_at = case
    when sender_user_id is not null and read_by_user_at is null then created_at
    else read_by_user_at
  end,
  read_by_admin_at = case
    when sender_admin_id is not null and read_by_admin_at is null then created_at
    else read_by_admin_at
  end;

drop policy if exists "support_ticket_messages_update_own_read" on public.support_ticket_messages;
create policy "support_ticket_messages_update_own_read"
on public.support_ticket_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        t.user_id = auth.uid()
        or public.goalnova_staff_effective_role() is not null
      )
  )
)
with check (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        t.user_id = auth.uid()
        or public.goalnova_staff_effective_role() is not null
      )
  )
);

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

  insert into public.support_ticket_messages (
    ticket_id,
    sender_admin_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (p_ticket_id, auth.uid(), trim(p_message), null, now())
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

  insert into public.support_ticket_messages (
    ticket_id,
    sender_user_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (v_id, v_uid, trim(p_message), now(), null);

  return v_id;
end;
$$;

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

  insert into public.support_ticket_messages (
    ticket_id,
    sender_admin_id,
    message,
    read_by_user_at,
    read_by_admin_at
  )
  values (v_id, auth.uid(), trim(p_message), null, now());

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'support_ticket_created_by_admin',
    jsonb_build_object('ticket_id', v_id, 'assigned_admin_id', p_assigned_admin_id)
  );

  return v_id;
end;
$$;

