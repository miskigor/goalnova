-- Paste in Supabase SQL Editor (required for reliable admin alerts).
-- Creates an in-app notification for staff whenever a partnership request is submitted.

create or replace function public.goalnova_notify_staff_club_partnership_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'pending' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from 'pending' then
    return new;
  end if;

  begin
    insert into public.notifications (user_id, type, message, related_user_id, is_read)
    select
      u.id,
      'club_partnership',
      '__gn:club_partnership_request_pending__'::text,
      u.id,
      false
    from public.users u
    where (
      u.admin_role in ('super_admin', 'support_admin')
      or (coalesce(u.is_admin, false) = true and u.admin_role is null)
    )
      and coalesce(u.is_deleted, false) = false;
  exception
    when others then
      raise warning 'goalnova_notify_staff_club_partnership_pending insert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists trg_club_partnership_requests_staff_pending_notify
  on public.club_partnership_requests;

create trigger trg_club_partnership_requests_staff_pending_notify
after insert or update on public.club_partnership_requests
for each row
execute function public.goalnova_notify_staff_club_partnership_pending();
