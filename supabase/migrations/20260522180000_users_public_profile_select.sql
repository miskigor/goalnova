-- Public read of non-deleted users for Explore / Search / feed avatars and is_deleted filtering.
-- App uses .select("id,is_deleted,avatar_url") (or subsets). RLS filters rows only, not columns.
-- Both anon and authenticated: column-level SELECT on public profile fields only (no table-level grant).

alter table public.users enable row level security;

drop policy if exists "users_select_public_profile" on public.users;

create policy "users_select_public_profile"
  on public.users
  for select
  to anon, authenticated
  using (coalesce(is_deleted, false) = false);

revoke select on table public.users from anon;
revoke select on table public.users from authenticated;
grant select (id, is_deleted, avatar_url) on table public.users to anon, authenticated;
