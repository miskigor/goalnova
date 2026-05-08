-- Dedicated scout application rows + RPC that upserts and syncs users.scout_verification_status.

create table if not exists public.scout_verification_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  full_name text not null,
  organization text not null,
  business_email text not null,
  country text not null,
  description text,
  web_url text,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  unique(user_id)
);

alter table public.scout_verification_applications enable row level security;

drop policy if exists "scout_verification_applications_select_own" on public.scout_verification_applications;
drop policy if exists "scout_verification_applications_insert_own" on public.scout_verification_applications;
drop policy if exists "scout_verification_applications_update_own" on public.scout_verification_applications;

create policy "scout_verification_applications_select_own"
on public.scout_verification_applications
for select
to authenticated
using (auth.uid() = user_id);

create policy "scout_verification_applications_insert_own"
on public.scout_verification_applications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "scout_verification_applications_update_own"
on public.scout_verification_applications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop function if exists public.submit_scout_verification_application(text, text, text, text, text, text);

create or replace function public.submit_scout_verification_application(
  p_business_email text,
  p_country text,
  p_description text,
  p_full_name text,
  p_organization text,
  p_web_url text
)
returns public.scout_verification_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.scout_verification_applications;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.scout_verification_applications (
    user_id,
    full_name,
    organization,
    business_email,
    country,
    description,
    web_url,
    status
  )
  values (
    v_user_id,
    p_full_name,
    p_organization,
    p_business_email,
    p_country,
    p_description,
    p_web_url,
    'pending'
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        organization = excluded.organization,
        business_email = excluded.business_email,
        country = excluded.country,
        description = excluded.description,
        web_url = excluded.web_url,
        status = 'pending';

  update public.users
  set scout_verification_status = 'pending'
  where id = v_user_id;

  select *
  into v_row
  from public.scout_verification_applications
  where user_id = v_user_id;

  return v_row;
end;
$$;

grant select, insert, update on table public.scout_verification_applications to authenticated;

revoke all on function public.submit_scout_verification_application(text, text, text, text, text, text) from public;
grant execute on function public.submit_scout_verification_application(text, text, text, text, text, text) to authenticated;
