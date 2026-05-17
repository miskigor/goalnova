-- Ensure goalnova_admin_set_app_role exists in prod (idempotent).
-- Signature: (p_user_id uuid, p_role text) — matches frontend rpcAdminSetAppRole.

create or replace function public.goalnova_admin_set_app_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  v_role := lower(trim(p_role));
  if v_role not in ('player', 'scout') then
    raise exception 'Invalid role';
  end if;

  update public.users
  set role = v_role
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_app_role',
    jsonb_build_object('role', v_role)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_set_app_role(uuid, text) from public;
grant execute on function public.goalnova_admin_set_app_role(uuid, text) to authenticated;
