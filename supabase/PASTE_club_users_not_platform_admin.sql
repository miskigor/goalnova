-- Paste in Supabase SQL Editor.
-- Club users must not open platform Admin. Only royalexpert1@gmail.com is staff.

update public.users
set
  is_admin = false,
  admin_role = null
where lower(trim(coalesce(email, ''))) <> 'royalexpert1@gmail.com'
  and (
    coalesce(is_admin, false) = true
    or nullif(trim(admin_role), '') is not null
  );

update public.users
set
  is_admin = true,
  admin_role = coalesce(nullif(trim(admin_role), ''), 'super_admin')
where lower(trim(coalesce(email, ''))) = 'royalexpert1@gmail.com';
