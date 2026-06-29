-- Paste in Supabase SQL Editor to allow admins to delete clubs from /admin/clubs.
-- Requires club partnership migration (20260630120000_club_partnership_system.sql).

create or replace function public.goalnova_admin_club_delete(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user uuid;
  v_club_name text;
begin
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select c.name into v_club_name from public.clubs c where c.id = p_club_id;
  if v_club_name is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  create temp table _goalnova_club_delete_users (user_id uuid primary key) on commit drop;

  insert into _goalnova_club_delete_users (user_id)
  select distinct cm.user_id
  from public.club_memberships cm
  where cm.club_id = p_club_id;

  delete from public.club_memberships where club_id = p_club_id;

  for v_user in select d.user_id from _goalnova_club_delete_users d loop
    perform public.goalnova_club_sync_member_premium(v_user);
  end loop;

  delete from public.clubs where id = p_club_id;

  perform public.goalnova_clubs_refresh_all_ranks();

  perform public.goalnova_admin_audit_log(
    null,
    'club_deleted',
    jsonb_build_object('club_id', p_club_id, 'club_name', v_club_name)
  );

  return jsonb_build_object('ok', true, 'club_id', p_club_id);
end;
$$;

revoke all on function public.goalnova_admin_club_delete(uuid) from public;
grant execute on function public.goalnova_admin_club_delete(uuid) to authenticated;
