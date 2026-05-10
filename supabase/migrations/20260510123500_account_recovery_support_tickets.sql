-- Move account recovery flow to support_tickets with anon-safe submit RPC.

alter table public.support_tickets
  alter column user_id drop not null;

alter table public.support_tickets
  add column if not exists ticket_type text not null default 'general'
    check (ticket_type in ('general', 'account_recovery')),
  add column if not exists account_email text,
  add column if not exists contact_email text,
  add column if not exists username text;

create index if not exists support_tickets_ticket_type_idx
  on public.support_tickets (ticket_type);

create or replace function public.goalnova_submit_account_recovery_ticket(
  p_account_email text,
  p_contact_email text,
  p_username text default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  a text := trim(lower(coalesce(p_account_email, '')));
  c text := trim(lower(coalesce(p_contact_email, '')));
  m text := trim(coalesce(p_message, ''));
  u text := nullif(trim(coalesce(p_username, '')), '');
begin
  if length(a) < 5 or length(a) > 254 or position('@' in a) < 2 then
    raise exception 'Invalid account email';
  end if;
  if length(c) < 5 or length(c) > 254 or position('@' in c) < 2 then
    raise exception 'Invalid contact email';
  end if;
  if length(m) < 10 then
    raise exception 'Message too short';
  end if;
  if length(m) > 4000 then
    raise exception 'Message too long';
  end if;
  if u is not null and length(u) > 120 then
    raise exception 'Username too long';
  end if;

  insert into public.support_tickets (
    user_id,
    subject,
    message,
    category,
    ticket_type,
    account_email,
    contact_email,
    username,
    status,
    priority
  )
  values (
    null,
    'Account recovery request',
    m,
    'account_issue',
    'account_recovery',
    a,
    c,
    u,
    'open',
    'normal'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.goalnova_submit_account_recovery_ticket(text, text, text, text)
  from public;
grant execute on function public.goalnova_submit_account_recovery_ticket(text, text, text, text)
  to anon;
grant execute on function public.goalnova_submit_account_recovery_ticket(text, text, text, text)
  to authenticated;

create or replace function public.pitchrusch_submit_account_recovery_ticket(
  p_account_email text,
  p_contact_email text,
  p_username text default null,
  p_message text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.goalnova_submit_account_recovery_ticket(
    p_account_email,
    p_contact_email,
    p_username,
    p_message
  );
$$;

revoke all on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  from public;
grant execute on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  to anon;
grant execute on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  to authenticated;
