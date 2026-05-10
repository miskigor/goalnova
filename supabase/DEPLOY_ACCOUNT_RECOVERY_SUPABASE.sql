-- =============================================================================
-- ACCOUNT RECOVERY – jednokratno pokreni na Supabase projektu koji koristi web
-- (isti projekt kao NEXT_PUBLIC_SUPABASE_URL u Netlify / .env).
--
-- Simptomi bez ovoga:
--   • Could not find the function ... pitchrusch_submit_account_recovery_ticket ...
--   • Could not find the function ... goalnova_submit_account_recovery_ticket ...
--   • new row violates row-level security policy for table "support_tickets"
--
-- Nakon izvršavanja: Settings → API → provjeri da URL odgovara Netlify env.
-- =============================================================================

-- Kolone + indeks (idempotentno)
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

-- PostgREST traži točan overload (text,text,text,text) – primarni red parametara:
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

-- Obnovi PostgREST cache da vidi nove funkcije
notify pgrst, 'reload schema';

-- RLS: dopusti anon/authenticated samo ovaj oblik retka (fallback ako RPC nije korišten)
drop policy if exists "support_tickets_insert_account_recovery" on public.support_tickets;

create policy "support_tickets_insert_account_recovery"
on public.support_tickets
for insert
to anon, authenticated
with check (
  ticket_type = 'account_recovery'
  and user_id is null
  and status = 'open'
  and priority = 'normal'
  and category = 'account_issue'
  and trim(subject) = 'Account recovery request'
  and assigned_admin_id is null
  and internal_note is null
  and account_email is not null
  and length(trim(account_email)) between 5 and 254
  and position('@' in trim(account_email)) >= 2
  and contact_email is not null
  and length(trim(contact_email)) between 5 and 254
  and position('@' in trim(contact_email)) >= 2
  and message is not null
  and length(trim(message)) between 10 and 4000
  and (username is null or length(trim(username)) <= 120)
);

notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- Provjera (pokreni ručno nakon gore navedenog):
-- -----------------------------------------------------------------------------
-- select p.proname, pg_get_function_identity_arguments(p.oid) as args
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in (
--     'pitchrusch_submit_account_recovery_ticket',
--     'goalnova_submit_account_recovery_ticket'
--   );
--
-- Očekivano: 2 retka, args = (p_account_email text, p_contact_email text,
--   p_message text, p_username text)
