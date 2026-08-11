-- Paste in Supabase SQL Editor (after club partnership account/proof migration).
-- On approve: create approved admin membership for the applicant coach.
-- Add admin reject for partnership requests.

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

    insert into public.club_memberships (
      club_id, user_id, status, is_admin, reviewed_at, reviewed_by
    ) values (
      v_club_id,
      v_req.applicant_user_id,
      'approved'::public.club_membership_status,
      true,
      now(),
      auth.uid()
    )
    on conflict (club_id, user_id) do update
    set
      status = 'approved'::public.club_membership_status,
      is_admin = true,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now();
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

create or replace function public.goalnova_admin_club_reject_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_req public.club_partnership_requests%rowtype;
begin
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then raise exception 'Forbidden'; end if;

  select * into v_req from public.club_partnership_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'already_reviewed'); end if;

  update public.club_partnership_requests
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  perform public.goalnova_admin_audit_log(
    null,
    'club_partnership_request_rejected',
    jsonb_build_object('request_id', p_request_id, 'club_name', v_req.club_name)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.goalnova_admin_club_reject_request(uuid) to authenticated;
