-- Harden notification delete RPC: resolve recipient id when auth.uid() is null inside
-- SECURITY DEFINER (PostgREST still passes JWT; sub fallback matches hide-message patterns).

create or replace function public.goalnova_delete_notification_for_me(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  uid uuid;
begin
  uid := (select auth.uid());

  if uid is null then
    begin
      uid := (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
    exception
      when others then
        uid := null;
    end;
  end if;

  if uid is null then
    return false;
  end if;

  delete from public.notifications n
  where n.id = p_notification_id
    and n.user_id = uid;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.goalnova_delete_notification_for_me(uuid) from public;
grant execute on function public.goalnova_delete_notification_for_me(uuid) to authenticated;
