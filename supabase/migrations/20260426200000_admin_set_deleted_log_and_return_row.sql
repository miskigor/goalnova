-- Strengthen admin soft-delete RPC observability and payload.
-- Canonical column: public.users.is_deleted

create or replace function public.goalnova_admin_set_deleted(
  p_user_id uuid,
  p_deleted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_updated public.users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_deleted = p_deleted
  where id = p_user_id
  returning * into v_updated;

  if not found then
    raise exception 'User not found';
  end if;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_deleted',
    jsonb_build_object('deleted', p_deleted, 'column', 'is_deleted')
  );

  return jsonb_build_object(
    'ok', true,
    'column_used', 'is_deleted',
    'p_deleted', p_deleted,
    'updated_row', to_jsonb(v_updated)
  );
end;
$$;

revoke all on function public.goalnova_admin_set_deleted(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_deleted(uuid, boolean) to authenticated;
