-- System / onboarding notification types + idempotency + secure self-insert.

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
    'scout_verification'
  ));

-- At most one row per user per onboarding/system type (prevents duplicate welcome etc. on retries).
create unique index if not exists notifications_user_onboarding_type_unique
  on public.notifications (user_id, type)
  where type in (
    'welcome',
    'onboarding',
    'profile',
    'upload',
    'scout_verification'
  );

-- Self-directed system notifications: recipient and actor are the same user.
drop policy if exists "notifications_insert_own_system" on public.notifications;

create policy "notifications_insert_own_system"
  on public.notifications
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and auth.uid() = related_user_id
    and type in (
      'welcome',
      'onboarding',
      'profile',
      'upload',
      'scout_verification'
    )
  );
