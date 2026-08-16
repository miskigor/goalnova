-- Paste in Supabase SQL Editor (required for reliable admin alerts).
-- 1) Allows notification type `club_partnership` (CHECK previously rejected it).
-- 2) Creates an in-app notification for staff whenever a partnership request is submitted.
-- 3) Backfills unread alerts if pending requests already exist.

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'follow',
    'like',
    'comment',
    'message',
    'ai_analysis',
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification',
    'scout_verification_approved',
    'scout_verification_rejected',
    'challenge',
    'admin_notice',
    'club_partnership'
  ));

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
  and coalesce(u.is_deleted, false) = false
  and exists (
    select 1
    from public.club_partnership_requests r
    where r.status = 'pending'
  )
  and not exists (
    select 1
    from public.notifications n
    where n.user_id = u.id
      and n.type = 'club_partnership'
      and n.message = '__gn:club_partnership_request_pending__'
      and n.is_read = false
  );
