-- 20260426173000 regressed goalnova_admin_set_suspended:
-- - ignored legacy is_admin (only checked admin_role)
-- - wrong audit insert column "payload" (should use goalnova_admin_audit_log RPC)
-- Restore canonical implementation.

create or replace function public.goalnova_admin_set_suspended(
  p_user_id uuid,
  p_suspended boolean
)
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
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_suspended = p_suspended
  where id = p_user_id;

  if not found then
    raise exception 'user not found';
  end if;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_suspended',
    jsonb_build_object('suspended', p_suspended)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_set_suspended(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_suspended(uuid, boolean) to authenticated;
