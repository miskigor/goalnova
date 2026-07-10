-- Paste in Supabase Dashboard → SQL Editor → Run (one-time).
-- Confirms all legacy accounts stuck without email_confirmed_at (could not log in).
-- Safe to re-run: only updates rows that are still unconfirmed.

update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmed_at = coalesce(confirmed_at, now())
where email_confirmed_at is null
  and confirmed_at is null;

-- Verify:
-- select count(*) from auth.users where email_confirmed_at is null;
