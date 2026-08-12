-- Welcome inbox: resolve sender via staff role OR bootstrap owner email.
-- Also promote bootstrap email to super_admin so DMs always have a sender.

create or replace function public.goalnova_resolve_welcome_inbox_sender()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where coalesce(u.is_deleted, false) = false
    and (
      u.admin_role = 'super_admin'
      or coalesce(u.is_admin, false) = true
      or u.admin_role in ('support_admin', 'moderator')
      or lower(trim(coalesce(u.email, ''))) = 'royalexpert1@gmail.com'
    )
  order by
    case
      when u.admin_role = 'super_admin' then 0
      when coalesce(u.is_admin, false) = true then 1
      when lower(trim(coalesce(u.email, ''))) = 'royalexpert1@gmail.com' then 2
      else 3
    end,
    u.created_at asc nulls last
  limit 1;
$$;

revoke all on function public.goalnova_resolve_welcome_inbox_sender() from public;
grant execute on function public.goalnova_resolve_welcome_inbox_sender() to authenticated, service_role;

-- Ensure bootstrap owner can send platform welcome DMs.
update public.users
set
  is_admin = true,
  admin_role = coalesce(nullif(trim(admin_role), ''), 'super_admin')
where lower(trim(coalesce(email, ''))) = 'royalexpert1@gmail.com'
  and coalesce(is_deleted, false) = false;
