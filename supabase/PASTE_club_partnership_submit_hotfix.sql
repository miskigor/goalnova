-- =============================================================================
-- HOTFIX: partnership request form ("Pošalji zahtjev")
-- =============================================================================
-- Error: Could not find the function goalnova_club_submit_partnership_request ...
-- Where: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- If you have NOT run the full clubs migration yet, prefer instead:
--   supabase/SUPABASE_PASTE_PENDING_MIGRATIONS.sql  (Part 2 — clubs)
-- =============================================================================

create table if not exists public.club_partnership_requests (
  id uuid primary key default gen_random_uuid(),
  club_name text not null,
  country text,
  contact_person text not null,
  email text not null,
  instagram text,
  website text,
  estimated_players int,
  message text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_club_id uuid,
  created_at timestamptz not null default now(),
  constraint club_partnership_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create or replace function public.goalnova_club_submit_partnership_request(
  p_club_name text,
  p_country text,
  p_contact_person text,
  p_email text,
  p_instagram text default null,
  p_website text default null,
  p_estimated_players int default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.club_partnership_requests (
    club_name, country, contact_person, email, instagram, website, estimated_players, message
  ) values (
    trim(p_club_name),
    nullif(trim(p_country), ''),
    trim(p_contact_person),
    trim(p_email),
    nullif(trim(p_instagram), ''),
    nullif(trim(p_website), ''),
    p_estimated_players,
    nullif(trim(p_message), '')
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'request_id', v_id);
end;
$$;

grant execute on function public.goalnova_club_submit_partnership_request(
  text, text, text, text, text, text, int, text
) to anon, authenticated;

-- Optional: confirm function exists
-- select proname from pg_proc where proname = 'goalnova_club_submit_partnership_request';
