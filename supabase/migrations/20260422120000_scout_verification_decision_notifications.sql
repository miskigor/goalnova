-- Scout verification admin decisions: use type `scout_verification` with explicit messages.
-- Allow multiple `scout_verification` rows per user (onboarding prompt + decisions).
-- Notification insert failures must not roll back approve/reject (SAVEPOINT + EXCEPTION).

update public.notifications
set type = 'scout_verification'
where type in ('scout_verification_approved', 'scout_verification_rejected');

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

drop index if exists notifications_user_onboarding_type_unique;

create unique index notifications_user_onboarding_type_unique
  on public.notifications (user_id, type)
  where type in (
    'welcome',
    'onboarding',
    'profile',
    'upload'
  );

create or replace function public.admin_review_scout_verification(
  p_subject_user_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_current text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(is_admin, false)
  into v_admin
  from public.users
  where id = auth.uid();

  if not coalesce(v_admin, false) then
    raise exception 'Forbidden';
  end if;

  if p_action is null or lower(trim(p_action)) not in ('approve', 'reject') then
    raise exception 'Invalid action';
  end if;

  select status
  into v_current
  from public.scout_verification_applications
  where user_id = p_subject_user_id;

  if not found then
    raise exception 'Application not found';
  end if;

  if lower(trim(p_action)) = 'approve' then
    if v_current = 'approved' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'approved'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'approved'
    where id = p_subject_user_id;

    begin
      savepoint admin_scout_verification_notify;
      insert into public.notifications (user_id, type, message, related_user_id)
      values (
        p_subject_user_id,
        'scout_verification',
        'Your scout verification was approved.',
        p_subject_user_id
      );
    exception
      when others then
        rollback to savepoint admin_scout_verification_notify;
    end;

  else
    if v_current = 'rejected' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'rejected'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'rejected'
    where id = p_subject_user_id;

    begin
      savepoint admin_scout_verification_notify;
      insert into public.notifications (user_id, type, message, related_user_id)
      values (
        p_subject_user_id,
        'scout_verification',
        'Your scout verification was not approved.',
        p_subject_user_id
      );
    exception
      when others then
        rollback to savepoint admin_scout_verification_notify;
    end;
  end if;

  return jsonb_build_object('ok', true, 'noop', false);
end;
$$;
