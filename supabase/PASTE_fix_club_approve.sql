-- =============================================================================
-- FIX: "Odobri i kreiraj klub" — goalnova_admin_audit_log wrong arguments
-- =============================================================================
-- Supabase Dashboard → SQL Editor → Paste → Run
-- Then refresh /admin/clubs and click approve again.
-- =============================================================================

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

  v_slug := public.goalnova_club_slugify(v_req.club_name);
  if exists (select 1 from public.clubs where slug = v_slug) then
    v_slug := v_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  end if;
  v_code := public.goalnova_club_generate_code(v_req.club_name);

  insert into public.clubs (
    name, slug, country, website, instagram, description, club_code,
    contact_person, contact_email, partnership_status
  ) values (
    v_req.club_name, v_slug, v_req.country, v_req.website, v_req.instagram,
    coalesce(v_req.message, ''), v_code, v_req.contact_person, v_req.email, 'pending'
  )
  returning id into v_club_id;

  update public.club_partnership_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), created_club_id = v_club_id
  where id = p_request_id;

  begin
    perform public.goalnova_admin_audit_log(
      null,
      'club_partnership_request_approved',
      jsonb_build_object('request_id', p_request_id, 'club_id', v_club_id)
    );
  exception
    when undefined_function then
      null;
  end;

  return jsonb_build_object('ok', true, 'club_id', v_club_id, 'club_code', v_code, 'slug', v_slug);
end;
$$;

grant execute on function public.goalnova_admin_club_approve_request(uuid) to authenticated;
