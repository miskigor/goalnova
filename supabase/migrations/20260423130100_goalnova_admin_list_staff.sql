-- Staff directory for super-admin assignment UIs.
create or replace function public.goalnova_admin_list_staff_users()
returns table (
  id uuid,
  email text,
  admin_role text
)
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
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select u.id, u.email, u.admin_role
  from public.users u
  where u.admin_role is not null or coalesce(u.is_admin, false) = true
  order by u.email nulls last;
end;
$$;

revoke all on function public.goalnova_admin_list_staff_users() from public;
grant execute on function public.goalnova_admin_list_staff_users() to authenticated;
