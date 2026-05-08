-- Scout verification: status + application fields on users, submit RPC.
-- After apply: regenerate lib/supabase/database.types.ts from your project.

alter table public.users
  add column if not exists scout_verification_status text not null default 'none'
    constraint users_scout_verification_status_check
      check (scout_verification_status in ('none', 'pending', 'approved', 'rejected'));

alter table public.users
  add column if not exists scout_apply_full_name text,
  add column if not exists scout_apply_organization text,
  add column if not exists scout_apply_business_email text,
  add column if not exists scout_apply_country text,
  add column if not exists scout_apply_description text,
  add column if not exists scout_apply_web_url text,
  add column if not exists scout_apply_submitted_at timestamptz;

comment on column public.users.scout_verification_status is 'Scout access gate: none | pending | approved | rejected';

-- Existing scouts keep full access (no forced re-application for current users).
update public.users
set scout_verification_status = 'approved'
where role = 'scout'
  and scout_verification_status = 'none';

create or replace function public.submit_scout_verification_application(
  p_full_name text,
  p_organization text,
  p_business_email text,
  p_country text,
  p_description text,
  p_web_url text default null
)
returns table (success boolean, error_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is null then
    return query select false::boolean, 'not_authenticated'::text;
    return;
  end if;

  update public.users u
  set
    scout_apply_full_name = nullif(trim(p_full_name), ''),
    scout_apply_organization = nullif(trim(p_organization), ''),
    scout_apply_business_email = nullif(trim(p_business_email), ''),
    scout_apply_country = nullif(trim(p_country), ''),
    scout_apply_description = nullif(trim(p_description), ''),
    scout_apply_web_url = nullif(trim(p_web_url), ''),
    scout_apply_submitted_at = now(),
    scout_verification_status = 'pending'
  where u.id = auth.uid()
    and u.role = 'scout'
    and u.scout_verification_status in ('none', 'rejected');

  get diagnostics n = row_count;

  if n = 0 then
    return query select false::boolean, 'not_eligible'::text;
  else
    return query select true::boolean, null::text;
  end if;
end;
$$;

revoke all on function public.submit_scout_verification_application(text, text, text, text, text, text) from public;
grant execute on function public.submit_scout_verification_application(text, text, text, text, text, text) to authenticated;
