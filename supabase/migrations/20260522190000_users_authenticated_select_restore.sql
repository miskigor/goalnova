-- Corrective: undo overly narrow 20260522180000 grants (authenticated column-only broke login/onboarding).
-- Anon: column-level SELECT on id, is_deleted, avatar_url for non-deleted users only.
-- Authenticated: table-level SELECT + RLS (own row + non-deleted rows for feed avatar batch loads).
-- Admin list/detail uses SECURITY DEFINER RPCs (goalnova_admin_*); no client users table policies dropped here.

alter table public.users enable row level security;

drop policy if exists "users_select_public_profile" on public.users;

drop policy if exists "users_select_public_avatar" on public.users;
create policy "users_select_public_avatar"
  on public.users
  for select
  to anon
  using (coalesce(is_deleted, false) = false);

revoke select on table public.users from anon;
grant select (id, is_deleted, avatar_url) on table public.users to anon;

revoke select on table public.users from authenticated;
revoke select (id, is_deleted, avatar_url) on table public.users from authenticated;
grant select on table public.users to authenticated;

drop policy if exists "users_select_own_profile" on public.users;
create policy "users_select_own_profile"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

-- Logged-in Explore/Search/home batch .in("id", ownerIds) — same row filter as anon avatar policy.
drop policy if exists "users_select_feed_profiles" on public.users;
create policy "users_select_feed_profiles"
  on public.users
  for select
  to authenticated
  using (coalesce(is_deleted, false) = false);
