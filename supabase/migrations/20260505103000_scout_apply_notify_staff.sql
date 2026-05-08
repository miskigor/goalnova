-- When a scout submits (or resubmits after rejection) a verification application, notify staff inbox.
-- Matches support-ticket broadcast: super_admin, support_admin, legacy is_admin rows.
-- Failures inside the notify block must not roll back the application upsert.

create or replace function public.goalnova_notify_staff_scout_verification_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'pending' then
    return new;
  end if;

  -- Already pending → skip (e.g. resubmit while status unchanged avoids duplicate pings).
  if tg_op = 'UPDATE' and old.status is not distinct from 'pending'::text then
    return new;
  end if;

  begin
    insert into public.notifications (user_id, type, message, related_user_id, is_read)
    select
      u.id,
      'scout_verification',
      '__gn:scout_admin_review_pending__'::text,
      new.user_id,
      false
    from public.users u
    where (
      u.admin_role in ('super_admin', 'support_admin')
      or (coalesce(u.is_admin, false) = true and u.admin_role is null)
    )
      and coalesce(u.is_deleted, false) = false;
  exception
    when others then
      raise warning 'goalnova_notify_staff_scout_verification_pending insert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists trg_scout_verification_applications_staff_pending_notify
  on public.scout_verification_applications;

create trigger trg_scout_verification_applications_staff_pending_notify
after insert or update on public.scout_verification_applications
for each row
execute function public.goalnova_notify_staff_scout_verification_pending();
