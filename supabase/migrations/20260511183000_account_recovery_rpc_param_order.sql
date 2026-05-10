-- PostgREST resolves RPC args; align (text,text,text,text) order with client JSON:
-- p_account_email, p_contact_email, p_message, p_username

drop function if exists public.pitchrusch_submit_account_recovery_ticket(text, text, text, text);
drop function if exists public.goalnova_submit_account_recovery_ticket(text, text, text, text);

create or replace function public.goalnova_submit_account_recovery_ticket(
  p_account_email text,
  p_contact_email text,
  p_message text,
  p_username text default null
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
  p_message text,
  p_username text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.goalnova_submit_account_recovery_ticket(
    p_account_email,
    p_contact_email,
    p_message,
    p_username
  );
$$;

revoke all on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  from public;
grant execute on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  to anon;
grant execute on function public.pitchrusch_submit_account_recovery_ticket(text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
