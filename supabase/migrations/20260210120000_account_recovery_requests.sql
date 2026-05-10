-- Account recovery: guest-submitted requests (no login). Staff manage via SECURITY DEFINER RPCs.

create table if not exists public.account_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  account_email text not null,
  contact_email text not null,
  username text,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_recovery_requests_status_idx
  on public.account_recovery_requests (status);
create index if not exists account_recovery_requests_created_at_idx
  on public.account_recovery_requests (created_at desc);

alter table public.account_recovery_requests enable row level security;

create or replace function public.goalnova_submit_account_recovery_request(
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

  insert into public.account_recovery_requests (account_email, contact_email, username, message)
  values (a, c, u, m)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.goalnova_submit_account_recovery_request(text, text, text, text)
  from public;
grant execute on function public.goalnova_submit_account_recovery_request(text, text, text, text)
  to anon;
grant execute on function public.goalnova_submit_account_recovery_request(text, text, text, text)
  to authenticated;

create or replace function public.pitchrusch_submit_account_recovery_request(
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
  select public.goalnova_submit_account_recovery_request(
    p_account_email,
    p_contact_email,
    p_username,
    p_message
  );
$$;

revoke all on function public.pitchrusch_submit_account_recovery_request(text, text, text, text)
  from public;
grant execute on function public.pitchrusch_submit_account_recovery_request(text, text, text, text)
  to anon;
grant execute on function public.pitchrusch_submit_account_recovery_request(text, text, text, text)
  to authenticated;

create or replace function public.goalnova_admin_list_account_recovery_requests(
  p_limit int default 200
)
returns setof public.account_recovery_requests
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
  select r.*
  from public.account_recovery_requests r
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

revoke all on function public.goalnova_admin_list_account_recovery_requests(int)
  from public;
grant execute on function public.goalnova_admin_list_account_recovery_requests(int)
  to authenticated;

create or replace function public.goalnova_admin_resolve_account_recovery_request(p_id uuid)
returns jsonb
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

  update public.account_recovery_requests r
  set
    status = 'resolved',
    updated_at = now()
  where r.id = p_id;

  if not found then
    raise exception 'Request not found';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_resolve_account_recovery_request(uuid)
  from public;
grant execute on function public.goalnova_admin_resolve_account_recovery_request(uuid)
  to authenticated;
