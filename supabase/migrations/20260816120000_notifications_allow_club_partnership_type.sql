-- Club partnership staff alerts used type `club_partnership`, but the notifications
-- CHECK constraint never allowed it — inserts failed silently and the Admin → Clubs
-- badge stayed at 0. Allow the type and backfill unread rows while requests are pending.

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
