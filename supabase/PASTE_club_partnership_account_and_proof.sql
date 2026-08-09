-- Paste in Supabase SQL Editor.
-- Club partnership: require signed-in applicant + proof document; link coach on approve.
--
-- Also create Storage bucket (Dashboard → Storage → New bucket):
--   name: club-verification-documents
--   Public: OFF
--   File size limit: 10MB
--   Allowed MIME: application/pdf, image/jpeg, image/png

alter table public.club_partnership_requests
  add column if not exists applicant_user_id uuid references auth.users (id) on delete set null;

alter table public.club_partnership_requests
  add column if not exists proof_storage_path text;

alter table public.club_partnership_requests
  add column if not exists proof_file_name text;

create index if not exists club_partnership_requests_applicant_idx
  on public.club_partnership_requests (applicant_user_id);

-- Submit: authenticated only, proof required
create or replace function public.goalnova_club_submit_partnership_request(
  p_club_name text,
  p_country text,
  p_contact_person text,
  p_email text,
  p_instagram text default null,
  p_website text default null,
  p_estimated_players int default null,
  p_message text default null,
  p_proof_storage_path text default null,
  p_proof_file_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_proof text := nullif(trim(coalesce(p_proof_storage_path, '')), '');
  v_proof_name text := nullif(trim(coalesce(p_proof_file_name, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_proof is null or v_proof_name is null then
    return jsonb_build_object('ok', false, 'error', 'proof_required');
  end if;

  -- Path must belong to this user (prefix userId/)
  if position(v_uid::text || '/' in v_proof) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_proof_path');
  end if;

  insert into public.club_partnership_requests (
    club_name, country, contact_person, email, instagram, website,
    estimated_players, message, applicant_user_id, proof_storage_path, proof_file_name
  ) values (
    trim(p_club_name),
    nullif(trim(p_country), ''),
    trim(p_contact_person),
    trim(p_email),
    nullif(trim(p_instagram), ''),
    nullif(trim(p_website), ''),
    p_estimated_players,
    nullif(trim(p_message), ''),
    v_uid,
    v_proof,
    v_proof_name
  )
  returning id into v_id;

  -- Mark applicant as club contact (skips player/scout role gate)
  insert into public.users (id, email, role)
  values (
    v_uid,
    nullif(trim(p_email), ''),
    'club'
  )
  on conflict (id) do update
  set
    role = 'club',
    email = coalesce(nullif(trim(p_email), ''), public.users.email);

  return jsonb_build_object('ok', true, 'request_id', v_id);
end;
$$;

revoke all on function public.goalnova_club_submit_partnership_request(
  text, text, text, text, text, text, int, text, text, text
) from public;
grant execute on function public.goalnova_club_submit_partnership_request(
  text, text, text, text, text, text, int, text, text, text
) to authenticated;

-- Drop old 8-arg overload if present (anon could call without proof)
drop function if exists public.goalnova_club_submit_partnership_request(
  text, text, text, text, text, text, int, text
);

-- Admin list includes proof + applicant
create or replace function public.goalnova_admin_club_requests_list()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then raise exception 'Forbidden'; end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from (
        select
          id,
          club_name,
          country,
          contact_person,
          email,
          instagram,
          website,
          estimated_players,
          message,
          status,
          created_at,
          applicant_user_id,
          proof_storage_path,
          proof_file_name
        from public.club_partnership_requests
        where status = 'pending'
        order by created_at desc
      ) r
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.goalnova_admin_club_requests_list() to authenticated;

-- Approve: create club + set coach_user_id from applicant
create or replace function public.goalnova_admin_club_approve_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_req public.club_partnership_requests%rowtype;
  v_slug text;
  v_code text;
  v_club_id uuid;
begin
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then raise exception 'Forbidden'; end if;

  select * into v_req from public.club_partnership_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'already_reviewed'); end if;

  if v_req.proof_storage_path is null or length(trim(v_req.proof_storage_path)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'proof_required');
  end if;

  v_slug := public.goalnova_club_slugify(v_req.club_name);
  if exists (select 1 from public.clubs where slug = v_slug) then
    v_slug := v_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  end if;
  v_code := public.goalnova_club_generate_code(v_req.club_name);

  insert into public.clubs (
    name, slug, country, website, instagram, description, club_code,
    contact_person, contact_email, partnership_status, coach_user_id
  ) values (
    v_req.club_name, v_slug, v_req.country, v_req.website, v_req.instagram,
    coalesce(v_req.message, ''), v_code, v_req.contact_person, v_req.email, 'pending',
    v_req.applicant_user_id
  )
  returning id into v_club_id;

  update public.club_partnership_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), created_club_id = v_club_id
  where id = p_request_id;

  if v_req.applicant_user_id is not null then
    insert into public.users (id, email, role)
    values (v_req.applicant_user_id, v_req.email, 'club')
    on conflict (id) do update
    set role = 'club', email = coalesce(excluded.email, public.users.email);
  end if;

  perform public.goalnova_admin_audit_log(
    null,
    'club_partnership_request_approved',
    jsonb_build_object('request_id', p_request_id, 'club_id', v_club_id)
  );

  return jsonb_build_object('ok', true, 'club_id', v_club_id, 'club_code', v_code, 'slug', v_slug);
end;
$$;

grant execute on function public.goalnova_admin_club_approve_request(uuid) to authenticated;
