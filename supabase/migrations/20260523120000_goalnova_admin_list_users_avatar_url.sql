-- Admin user list: expose canonical profile photo URL for staff UI (SECURITY DEFINER).

create or replace function public.goalnova_admin_list_users(
  p_limit int default 50,
  p_offset int default 0,
  p_search text default null
)
returns table (
  id uuid,
  email text,
  role text,
  admin_role text,
  is_premium boolean,
  scout_verification_status text,
  is_suspended boolean,
  is_deleted boolean,
  created_at timestamptz,
  full_name text,
  username text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_search text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  v_search := nullif(trim(coalesce(p_search, '')), '');

  return query
  select
    u.id,
    u.email,
    u.role,
    u.admin_role,
    u.is_premium,
    u.scout_verification_status,
    u.is_suspended,
    u.is_deleted,
    u.created_at,
    pp.full_name,
    pp.username,
    u.avatar_url
  from public.users u
  left join public.player_profiles pp on pp.id = u.id
  where
    (v_staff = 'super_admin' or u.is_deleted = false)
    and (
      v_search is null
      or u.email ilike '%' || v_search || '%'
      or coalesce(pp.full_name, '') ilike '%' || v_search || '%'
      or coalesce(pp.username, '') ilike '%' || v_search || '%'
    )
  order by u.created_at desc nulls last
  limit greatest(1, least(p_limit, 200))
  offset greatest(0, p_offset);
end;
$$;

revoke all on function public.goalnova_admin_list_users(int, int, text) from public;
grant execute on function public.goalnova_admin_list_users(int, int, text) to authenticated;
