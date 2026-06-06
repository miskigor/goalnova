-- Scout access reads without widening public.users SELECT grants.
-- Fixes 42501 when clients select role / scout_verification_status (column grant is avatar-only).

create or replace function public.get_my_scout_access()
returns table (
  role text,
  scout_verification_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(u.role, 'player')::text,
    coalesce(u.scout_verification_status, 'none')::text
  from public.users u
  where u.id = auth.uid()
  limit 1;
$$;

comment on function public.get_my_scout_access() is
  'Returns role + scout_verification_status for the current user only (SECURITY DEFINER).';

revoke all on function public.get_my_scout_access() from public;
grant execute on function public.get_my_scout_access() to authenticated;

create or replace function public.get_scout_verification_flags(p_user_ids uuid[])
returns table (
  id uuid,
  role text,
  scout_verification_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    coalesce(u.role, 'player')::text,
    coalesce(u.scout_verification_status, 'none')::text
  from public.users u
  where p_user_ids is not null
    and cardinality(p_user_ids) > 0
    and u.id = any (p_user_ids)
    and coalesce(u.is_deleted, false) = false;
$$;

comment on function public.get_scout_verification_flags(uuid[]) is
  'Batch scout trust flags (id, role, scout_verification_status) for messaging badges; no other user columns.';

revoke all on function public.get_scout_verification_flags(uuid[]) from public;
grant execute on function public.get_scout_verification_flags(uuid[]) to authenticated;
